"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { addDaysIso, todayIso, zonedDateTime } from "@/lib/date-utils";
import type { AdhanPrayer, AdhanSoundId } from "@/lib/adhan-audio";
import {
  NATIVE_CONFIG_CHANGED_EVENT,
  parseNativeMessage,
  readNativePrayerPreferences,
  type NativeBridgeStatus,
} from "@/lib/android/native-web";

const PRODUCTION_ORIGIN = "https://donaumoschee.vercel.app";
const PUSH_STORAGE_KEY = "masjid-el-rahman-push-v1";

type ContextValue = {
  isNative: boolean;
  status: NativeBridgeStatus | null;
  requestPermissions: () => void;
  requestStatus: () => void;
  scheduleTest: (mode: "adhan" | "reminder", prayer: AdhanPrayer, adhanSoundId: AdhanSoundId) => Promise<boolean>;
};

const NativeAndroidContext = createContext<ContextValue>({
  isNative: false,
  status: null,
  requestPermissions: () => undefined,
  requestStatus: () => undefined,
  scheduleTest: async () => false,
});

type PendingTest = { resolve: (success: boolean) => void; timer: number };

export function NativeAndroidProvider({ children }: { children: React.ReactNode }) {
  const { session } = usePublicAuth();
  const { pushStatus, enableNotifications } = useAppPreferences();
  const [status, setStatus] = useState<NativeBridgeStatus | null>(null);
  const [channelRevision, setChannelRevision] = useState(0);
  const portRef = useRef<MessagePort | null>(null);
  const pendingTests = useRef(new Map<string, PendingTest>());

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    portRef.current?.postMessage(JSON.stringify({ version: 1, type, payload }));
  }, []);

  const handleNativeMessage = useCallback((raw: unknown) => {
    const message = parseNativeMessage(raw);
    if (!message) return;
    if (message.type === "native.ready" || message.type === "native.status") {
      setStatus(message.payload as NativeBridgeStatus);
    } else if (message.type === "native.configure.result") {
      const nested = message.payload.status;
      if (nested && typeof nested === "object") setStatus(nested as NativeBridgeStatus);
    } else if (message.type === "native.test.result") {
      const key = typeof message.payload.mode === "string" ? message.payload.mode : "";
      const pending = pendingTests.current.get(key);
      if (pending) {
        window.clearTimeout(pending.timer);
        pendingTests.current.delete(key);
        pending.resolve(message.payload.success === true);
      }
    }
  }, []);

  useEffect(() => {
    const receiveInitialPort = (event: MessageEvent) => {
      if (event.origin !== PRODUCTION_ORIGIN || !event.ports[0]) return;
      const initial = parseNativeMessage(event.data);
      if (!initial || initial.type !== "native.ready") return;
      const port = event.ports[0];
      port.onmessage = (portEvent) => handleNativeMessage(portEvent.data);
      port.start();
      portRef.current = port;
      handleNativeMessage(initial);
      setChannelRevision((current) => current + 1);
      port.postMessage(JSON.stringify({ version: 1, type: "native.status.request", payload: {} }));
    };
    window.addEventListener("message", receiveInitialPort);
    return () => {
      window.removeEventListener("message", receiveInitialPort);
      portRef.current?.close();
      portRef.current = null;
    };
  }, [handleNativeMessage]);

  const syncConfiguration = useCallback(async () => {
    if (!portRef.current) return;
    const preferences = readNativePrayerPreferences();
    if (!preferences) return;
    const from = todayIso(new Date());
    try {
      const [scheduleResponse, catalogResponse] = await Promise.all([
        fetch(`/api/android/prayer-schedule?from=${from}&days=31`, { cache: "no-store" }),
        fetch("/api/android/adhan-catalog", { cache: "force-cache" }),
      ]);
      if (!scheduleResponse.ok || !catalogResponse.ok) return;
      const schedule = await scheduleResponse.json() as {
        schemaVersion: number;
        timeZone: string;
        through: string;
        rows: Array<Record<string, unknown>>;
      };
      const catalog = await catalogResponse.json() as { schemaVersion: number; sounds: Array<Record<string, unknown>> };
      if (schedule.schemaVersion !== 1 || schedule.timeZone !== "Europe/Berlin" || !Array.isArray(schedule.rows) || schedule.rows.length === 0) return;
      const latestRowRevision = schedule.rows.reduce((latest, row) => {
        const updated = typeof row.updated_at === "string" ? row.updated_at : "";
        return updated > latest ? updated : latest;
      }, "");
      const scheduleValidUntil = zonedDateTime(addDaysIso(schedule.through, 1), "00:00").toISOString();
      send("web.configure", {
        schemaVersion: 1,
        revision: `${preferences.updatedAt}|${latestRowRevision}`.slice(0, 128),
        timeZone: "Europe/Berlin",
        scheduleValidUntil,
        rows: schedule.rows,
        reminders: preferences.reminders,
        catalog,
      });
    } catch (error) {
      console.warn("Native prayer configuration sync failed", error);
    }
  }, [send]);

  useEffect(() => {
    const sync = () => { void syncConfiguration(); };
    window.addEventListener(NATIVE_CONFIG_CHANGED_EVENT, sync);
    if (channelRevision > 0) sync();
    return () => window.removeEventListener(NATIVE_CONFIG_CHANGED_EVENT, sync);
  }, [channelRevision, syncConfiguration]);

  useEffect(() => {
    if (!status?.notificationPermission || pushStatus === "enabled" || pushStatus === "checking") return;
    void enableNotifications();
  }, [enableNotifications, pushStatus, status?.notificationPermission]);

  useEffect(() => {
    if (!status?.installationId || !status.credential || !session?.access_token || channelRevision === 0) return;
    let active = true;
    const enroll = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem(PUSH_STORAGE_KEY) || "null") as { browserId?: string } | null;
        const registration = await navigator.serviceWorker?.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (!stored?.browserId || !active) return;
        const response = await fetch("/api/android/native-authority/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            installationId: status.installationId,
            credential: status.credential,
            browserId: stored.browserId,
            endpoint: subscription?.endpoint || null,
          }),
        });
        if (response.ok && active) {
          send("native.status.request");
          void syncConfiguration();
        }
      } catch (error) {
        console.warn("Native installation enrollment failed", error);
      }
    };
    void enroll();
    return () => { active = false; };
  }, [channelRevision, send, session?.access_token, status?.credential, status?.installationId, syncConfiguration, pushStatus]);

  const requestPermissions = useCallback(() => send("native.permissions.request", { mode: "both" }), [send]);
  const requestStatus = useCallback(() => send("native.status.request"), [send]);
  const scheduleTest = useCallback((mode: "adhan" | "reminder", prayer: AdhanPrayer, adhanSoundId: AdhanSoundId) => (
    new Promise<boolean>((resolve) => {
      if (!portRef.current || pendingTests.current.has(mode)) return resolve(false);
      const timer = window.setTimeout(() => {
        pendingTests.current.delete(mode);
        resolve(false);
      }, 5_000);
      pendingTests.current.set(mode, { resolve, timer });
      send("native.test.schedule", { mode, prayer, adhanSoundId, delaySeconds: 10 });
    })
  ), [send]);

  useEffect(() => () => {
    for (const pending of pendingTests.current.values()) {
      window.clearTimeout(pending.timer);
      pending.resolve(false);
    }
    pendingTests.current.clear();
  }, []);

  const value = useMemo<ContextValue>(() => ({
    isNative: Boolean(status?.native && status.packageId === "de.donaumoschee.app"),
    status,
    requestPermissions,
    requestStatus,
    scheduleTest,
  }), [requestPermissions, requestStatus, scheduleTest, status]);

  return <NativeAndroidContext.Provider value={value}>{children}</NativeAndroidContext.Provider>;
}

export function useNativeAndroid() {
  return useContext(NativeAndroidContext);
}
