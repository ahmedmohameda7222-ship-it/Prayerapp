"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type NotificationPreferenceKey = "prayer" | "iqama" | "jumuah" | "announcements" | "azkar";
type Preferences = Record<NotificationPreferenceKey, boolean>;

const defaultPreferences: Preferences = { prayer: true, iqama: true, jumuah: true, announcements: true, azkar: false };
const STORAGE_KEY = "deggendorf-app-preferences-v1";

type ContextValue = {
  notifications: Preferences;
  setNotification: (key: NotificationPreferenceKey, enabled: boolean) => void;
  permission: NotificationPermission | "unsupported";
  requestNotificationPermission: () => Promise<void>;
};

const AppPreferencesContext = createContext<ContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const loadStored = () => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as { notifications?: Partial<Preferences> } | null;
    } catch { return null; }
  };
  const [notifications, setNotifications] = useState<Preferences>(() => ({ ...defaultPreferences, ...(loadStored()?.notifications || {}) }));
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");

  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "light";
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ notifications }));
  }, [notifications]);

  const setNotification = useCallback((key: NotificationPreferenceKey, enabled: boolean) => {
    setNotifications((current) => ({ ...current, [key]: enabled }));
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return setPermission("unsupported");
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      const registration = await navigator.serviceWorker?.ready;
      await registration?.showNotification("Masjid El-Rahman", { body: "Notifications are enabled.", icon: "/assets/app-icon-main.png" });
    }
  }, []);

  const value = useMemo(() => ({ notifications, setNotification, permission, requestNotificationPermission }), [notifications, setNotification, permission, requestNotificationPermission]);
  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const value = useContext(AppPreferencesContext);
  if (!value) throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  return value;
}
