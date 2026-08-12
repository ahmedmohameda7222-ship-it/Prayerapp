"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { usePublicAuth } from "@/components/providers/AuthProvider";

type PushStatus =
  | "checking"
  | "unsupported"
  | "ios-install-required"
  | "unconfigured"
  | "denied"
  | "disabled"
  | "enabled"
  | "error";

interface StoredPreferences {
  browserId: string;
}

type ContextValue = {
  pushStatus: PushStatus;
  permission: NotificationPermission | "unsupported";
  busy: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  detachAccount: () => Promise<void>;
};

const STORAGE_KEY = "masjid-el-rahman-push-v1";
const AppPreferencesContext = createContext<ContextValue | null>(null);

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function readStoredPreferences(): StoredPreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<StoredPreferences> | null;
    return { browserId: stored?.browserId || crypto.randomUUID() };
  } catch {
    return { browserId: crypto.randomUUID() };
  }
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const { session } = usePublicAuth();
  const [stored, setStored] = useState<StoredPreferences | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>("checking");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [busy, setBusy] = useState(false);

  const saveStored = useCallback((next: StoredPreferences) => {
    setStored(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const syncSubscription = useCallback(async (
    subscription: PushSubscription,
    preferences: StoredPreferences,
    forceGuest = false,
  ) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (!forceGuest && session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const response = await fetch("/api/push/subscriptions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        browserId: preferences.browserId,
        locale,
        platform: navigator.platform,
      }),
    });
    if (!response.ok) throw new Error("Could not save push subscription");
  }, [locale, session?.access_token]);

  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "light";
    localStorage.setItem("deggendorf-app-preferences-v1", "{}");
    let active = true;

    const initialize = async () => {
      const preferences = readStoredPreferences();
      await Promise.resolve();
      if (!active) return;
      saveStored(preferences);

      if (isIos() && !isStandalone()) {
        setPermission("Notification" in window ? Notification.permission : "unsupported");
        setPushStatus("ios-install-required");
        return;
      }
      if (!isSupported()) {
        setPermission("unsupported");
        setPushStatus("unsupported");
        return;
      }

      setPermission(Notification.permission);
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setPushStatus("unconfigured");
        return;
      }
      if (Notification.permission === "denied") {
        setPushStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!active) return;
      if (!subscription) {
        setPushStatus("disabled");
        return;
      }
      try {
        await syncSubscription(subscription, preferences);
        setPushStatus("enabled");
      } catch {
        setPushStatus("error");
      }
    };
    void initialize();
    return () => { active = false; };
  }, [saveStored, syncSubscription]);

  const enableNotifications = useCallback(async () => {
    if (!stored || busy) return false;
    setBusy(true);
    try {
      if (isIos() && !isStandalone()) {
        setPushStatus("ios-install-required");
        return false;
      }
      if (!isSupported()) {
        setPermission("unsupported");
        setPushStatus("unsupported");
        return false;
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setPushStatus("unconfigured");
        return false;
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setPushStatus(result === "denied" ? "denied" : "disabled");
        return false;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await syncSubscription(subscription, stored);
      setPushStatus("enabled");
      return true;
    } catch (error) {
      console.warn("Push notification setup failed", error);
      setPushStatus("error");
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, stored, syncSubscription]);

  const disableNotifications = useCallback(async () => {
    if (!stored || busy || !isSupported()) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint, browserId: stored.browserId }),
        });
        await subscription.unsubscribe();
        if (!response.ok) throw new Error("Could not disable stored push subscription");
      }
      setPushStatus("disabled");
    } catch (error) {
      console.warn("Push notification disable failed", error);
      setPushStatus("error");
    } finally {
      setBusy(false);
    }
  }, [busy, stored]);

  const detachAccount = useCallback(async () => {
    if (!stored || !isSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await syncSubscription(subscription, stored, true);
  }, [stored, syncSubscription]);

  const value = useMemo<ContextValue>(() => ({
    pushStatus,
    permission,
    busy,
    enableNotifications,
    disableNotifications,
    detachAccount,
  }), [pushStatus, permission, busy, enableNotifications, disableNotifications, detachAccount]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const value = useContext(AppPreferencesContext);
  if (!value) throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  return value;
}
