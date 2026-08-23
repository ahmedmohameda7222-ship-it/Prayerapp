"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { addDaysIso, todayIso, zonedDateTime } from "@/lib/date-utils";
import type { AdhanPrayer, AdhanSoundId } from "@/lib/adhan-audio";
import {
  NATIVE_CONFIG_CHANGED_EVENT,
  isNativeAuthorityId,
  parseNativeMessage,
  readNativePrayerPreferences,
  supportsNativeAuthorityGeneration,
  supportsNativeSecretPrivate,
  type NativeBridgeStatus,
} from "@/lib/android/native-web";

const PRODUCTION_ORIGIN = "https://donaumoschee.vercel.app";
const PUSH_STORAGE_KEY = "masjid-el-rahman-push-v1";
const NATIVE_ACCOUNT_OWNER_KEY = "danube-native-account-owner-v1";

type ContextValue = {
  isNative: boolean;
  status: NativeBridgeStatus | null;
  requestPermissions: () => void;
  requestStatus: () => void;
  scheduleTest: (mode: "adhan" | "reminder", prayer: AdhanPrayer, adhanSoundId: AdhanSoundId) => Promise<boolean>;
  suspendNativeAuthority: () => Promise<void>;
};

const NativeAndroidContext = createContext<ContextValue>({
  isNative: false,
  status: null,
  requestPermissions: () => undefined,
  requestStatus: () => undefined,
  scheduleTest: async () => false,
  suspendNativeAuthority: async () => undefined,
});

type PendingTest = { resolve: (success: boolean) => void; timer: number };
type NativeEnrollmentAttempt = {
  key: string;
  userId: string;
  syncGeneration: number;
  accountGeneration: number;
};

function hasLegacyNativeState(status: NativeBridgeStatus | null) {
  return Boolean(
    (supportsNativeSecretPrivate(status) && status?.authorityId)
    || status?.alarmScheduleInstalled
    || status?.scheduleFresh
    || status?.nativeReady
    || status?.scheduleValidUntil,
  );
}

function accountRequiresReset(
  storedOwnerId: string | null,
  currentUserId: string | null,
  status: NativeBridgeStatus | null,
) {
  if (storedOwnerId !== null) return storedOwnerId !== currentUserId;
  return hasLegacyNativeState(status);
}

export function NativeAndroidProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = usePublicAuth();
  const sessionUserId = session?.user?.id ?? null;
  const sessionAccessToken = session?.access_token ?? null;
  const { pushStatus, enableNotifications } = useAppPreferences();
  const [status, setStatus] = useState<NativeBridgeStatus | null>(null);
  const [channelRevision, setChannelRevision] = useState(0);
  const [accountRevision, setAccountRevision] = useState(0);
  const portRef = useRef<MessagePort | null>(null);
  const accountTransitioningRef = useRef(false);
  const nativeResetCompleteRef = useRef(false);
  const remoteRevocationCompleteRef = useRef(false);
  const syncGenerationRef = useRef(0);
  const lastEnrolledAuthorityRef = useRef<string | null>(null);
  const enrollmentAttemptRef = useRef<NativeEnrollmentAttempt | null>(null);
  const sessionUserIdRef = useRef<string | null>(sessionUserId);
  const nativeUpdateRequiredRef = useRef(false);
  const pendingTests = useRef(new Map<string, PendingTest>());

  useEffect(() => {
    sessionUserIdRef.current = sessionUserId;
  }, [sessionUserId]);

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    portRef.current?.postMessage(JSON.stringify({ version: 1, type, payload }));
  }, []);

  const finishAccountTransition = useCallback(() => {
    if (
      !accountTransitioningRef.current
      || !nativeResetCompleteRef.current
      || !remoteRevocationCompleteRef.current
    ) return;
    syncGenerationRef.current += 1;
    accountTransitioningRef.current = false;
    nativeResetCompleteRef.current = false;
    remoteRevocationCompleteRef.current = false;
    setAccountRevision((current) => current + 1);
  }, []);

  const handleNativeMessage = useCallback((raw: unknown) => {
    const message = parseNativeMessage(raw);
    if (!message) return;
    if (message.type === "native.ready" || message.type === "native.status") {
      setStatus(message.payload as NativeBridgeStatus);
    } else if (message.type === "native.configure.result") {
      const nested = message.payload.status;
      if (nested && typeof nested === "object") setStatus(nested as NativeBridgeStatus);
    } else if (message.type === "native.account.reset.result") {
      const nested = message.payload.status;
      if (nested && typeof nested === "object") {
        const nestedStatus = nested as NativeBridgeStatus;
        setStatus(nestedStatus);
        if (supportsNativeSecretPrivate(nestedStatus)) remoteRevocationCompleteRef.current = true;
      }
      localStorage.removeItem(NATIVE_ACCOUNT_OWNER_KEY);
      nativeResetCompleteRef.current = true;
      finishAccountTransition();
    } else if (message.type === "native.authority.enroll.result") {
      const attempt = enrollmentAttemptRef.current;
      enrollmentAttemptRef.current = null;
      const nested = message.payload.status;
      const nestedStatus = nested && typeof nested === "object" ? nested as NativeBridgeStatus : null;
      if (
        !attempt
        || !nestedStatus
        || sessionUserIdRef.current !== attempt.userId
        || syncGenerationRef.current !== attempt.syncGeneration
        || nestedStatus.accountGeneration !== attempt.accountGeneration
      ) return;
      setStatus(nestedStatus);
      if (message.payload.success === true && isNativeAuthorityId(message.payload.authorityId)) {
        lastEnrolledAuthorityRef.current = message.payload.authorityId;
        localStorage.setItem(NATIVE_ACCOUNT_OWNER_KEY, attempt.userId);
        setAccountRevision((current) => current + 1);
        send("native.status.request");
      }
    } else if (message.type === "native.authority.result") {
      const nested = message.payload.status;
      if (nested && typeof nested === "object") setStatus(nested as NativeBridgeStatus);
    } else if (message.type === "native.update.required.result") {
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
  }, [finishAccountTransition, send]);

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
    if (
      authLoading
      || !sessionUserId
      || !portRef.current
      || accountTransitioningRef.current
      || nativeUpdateRequiredRef.current
      || status?.lastError === "required-update"
    ) return;
    const configuredOwnerId = localStorage.getItem(NATIVE_ACCOUNT_OWNER_KEY);
    if (configuredOwnerId !== sessionUserId) return;
    const preferences = readNativePrayerPreferences();
    if (!preferences) return;
    const syncGeneration = syncGenerationRef.current;
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
      if (
        accountTransitioningRef.current
        || syncGeneration !== syncGenerationRef.current
        || !portRef.current
      ) return;
      const latestRowRevision = schedule.rows.reduce((latest, row) => {
        const updated = typeof row.updated_at === "string" ? row.updated_at : "";
        return updated > latest ? updated : latest;
      }, "");
      const scheduleValidUntil = zonedDateTime(addDaysIso(schedule.through, 1), "00:00").toISOString();
      if (accountTransitioningRef.current || syncGeneration !== syncGenerationRef.current) return;
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
  }, [authLoading, send, sessionUserId, status?.lastError]);

  useEffect(() => {
    const sync = () => { void syncConfiguration(); };
    window.addEventListener(NATIVE_CONFIG_CHANGED_EVENT, sync);
    if (channelRevision > 0) sync();
    return () => window.removeEventListener(NATIVE_CONFIG_CHANGED_EVENT, sync);
  }, [accountRevision, channelRevision, syncConfiguration]);

  useEffect(() => {
    if (!status?.notificationPermission || pushStatus === "enabled" || pushStatus === "checking") return;
    void enableNotifications();
  }, [enableNotifications, pushStatus, status?.notificationPermission]);

  useEffect(() => {
    const nativeOwnsSecret = supportsNativeSecretPrivate(status);
    if (
      authLoading
      || !status?.installationId
      || (!nativeOwnsSecret && !status.credential)
      || channelRevision === 0
      || accountTransitioningRef.current
    ) return;
    const currentUserId = sessionUserId;
    const storedOwnerId = localStorage.getItem(NATIVE_ACCOUNT_OWNER_KEY);
    if (!accountRequiresReset(storedOwnerId, currentUserId, status)) return;

    accountTransitioningRef.current = true;
    nativeResetCompleteRef.current = false;
    remoteRevocationCompleteRef.current = nativeOwnsSecret;
    syncGenerationRef.current += 1;
    send("native.account.reset");
    if (nativeOwnsSecret) return;

    const revokeAuthority = async () => {
      try {
        const response = await fetch("/api/android/native-authority/heartbeat", {
          method: "DELETE",
          headers: {
            "X-Native-Installation-Id": status.installationId!,
            ...(status.authorityId ? { "X-Native-Authority-Id": status.authorityId } : {}),
            Authorization: `Native ${status.credential}`,
          },
        });
        if (response.ok && supportsNativeAuthorityGeneration(status)) {
          const revoked = await response.json().catch(() => null) as { authorityId?: unknown } | null;
          if (isNativeAuthorityId(revoked?.authorityId)) {
            const revokedAuthorityId = revoked.authorityId;
            send("native.authority.bind", { authorityId: revokedAuthorityId });
            setStatus((current) => current ? { ...current, authorityId: revokedAuthorityId } : current);
          }
        }
      } catch (error) {
        console.warn("Native authority revocation failed; local reset will still proceed", error);
      } finally {
        remoteRevocationCompleteRef.current = true;
        finishAccountTransition();
      }
    };
    void revokeAuthority();
  }, [accountRevision, authLoading, channelRevision, finishAccountTransition, send, sessionUserId, status]);

  useEffect(() => {
    const nativeOwnsSecret = supportsNativeSecretPrivate(status);
    if (
      authLoading
      || !status?.installationId
      || (!nativeOwnsSecret && !status.credential)
      || !sessionAccessToken
      || !sessionUserId
      || channelRevision === 0
      || accountTransitioningRef.current
      || nativeUpdateRequiredRef.current
      || status?.lastError === "required-update"
      || !supportsNativeAuthorityGeneration(status)
      || typeof status.accountGeneration !== "number"
      || !Number.isInteger(status.accountGeneration)
    ) return;
    const storedOwnerId = localStorage.getItem(NATIVE_ACCOUNT_OWNER_KEY);
    if (accountRequiresReset(storedOwnerId, sessionUserId, status)) return;
    if (
      storedOwnerId === sessionUserId
      && status.authorityId
      && status.authorityId === lastEnrolledAuthorityRef.current
    ) return;

    const enrollmentGeneration = syncGenerationRef.current;
    const nativeAccountGeneration = status.accountGeneration;
    const enrollmentKey = `${sessionUserId}:${status.installationId}:${status.authorityId || "new"}:${enrollmentGeneration}:${nativeAccountGeneration}`;
    if (enrollmentAttemptRef.current?.key === enrollmentKey) return;
    const attempt: NativeEnrollmentAttempt = {
      key: enrollmentKey,
      userId: sessionUserId,
      syncGeneration: enrollmentGeneration,
      accountGeneration: nativeAccountGeneration,
    };
    enrollmentAttemptRef.current = attempt;

    const enroll = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem(PUSH_STORAGE_KEY) || "null") as { browserId?: string } | null;
        const registration = await navigator.serviceWorker?.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (!stored?.browserId || accountTransitioningRef.current) {
          if (enrollmentAttemptRef.current?.key === enrollmentKey) enrollmentAttemptRef.current = null;
          return;
        }

        if (nativeOwnsSecret) {
          send("native.authority.enroll", {
            accessToken: sessionAccessToken,
            browserId: stored.browserId,
            endpoint: subscription?.endpoint || null,
          });
          return;
        }

        const response = await fetch("/api/android/native-authority/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionAccessToken}` },
          body: JSON.stringify({
            installationId: status.installationId,
            credential: status.credential,
            authorityId: status.authorityId || null,
            accountGeneration: nativeAccountGeneration,
            browserId: stored.browserId,
            endpoint: subscription?.endpoint || null,
          }),
        });
        const enrolled = await response.json().catch(() => null) as {
          authorityId?: unknown;
          code?: unknown;
        } | null;
        if (
          accountTransitioningRef.current
          || enrollmentGeneration !== syncGenerationRef.current
          || sessionUserIdRef.current !== sessionUserId
        ) return;
        if (response.ok) {
          if (!isNativeAuthorityId(enrolled?.authorityId)) return;
          lastEnrolledAuthorityRef.current = enrolled.authorityId;
          send("native.authority.bind", { authorityId: enrolled.authorityId });
          localStorage.setItem(NATIVE_ACCOUNT_OWNER_KEY, sessionUserId);
          send("native.status.request");
          void syncConfiguration();
        } else if (response.status === 409 && enrolled?.code === "authority_generation_missing") {
          lastEnrolledAuthorityRef.current = null;
          send("native.authority.clear");
          setStatus((current) => current ? { ...current, authorityId: undefined } : current);
        }
      } catch (error) {
        console.warn("Native installation enrollment failed", error);
      } finally {
        if (!nativeOwnsSecret && enrollmentAttemptRef.current?.key === enrollmentKey) enrollmentAttemptRef.current = null;
      }
    };
    void enroll();
  }, [accountRevision, authLoading, channelRevision, send, sessionAccessToken, sessionUserId, status, syncConfiguration]);

  const requestPermissions = useCallback(() => send("native.permissions.request", { mode: "both" }), [send]);
  const requestStatus = useCallback(() => send("native.status.request"), [send]);
  const suspendNativeAuthority = useCallback(async () => {
    nativeUpdateRequiredRef.current = true;
    syncGenerationRef.current += 1;
    const nativeOwnsSecret = supportsNativeSecretPrivate(status);
    send("native.update.required");
    if (nativeOwnsSecret) {
      setStatus((current) => current ? { ...current, nativeReady: false, engineHealthy: false } : current);
      return;
    }
    if (!status?.installationId || !status.credential) return;
    try {
      const response = await fetch("/api/android/native-authority/heartbeat", {
        method: "DELETE",
        headers: {
          "X-Native-Installation-Id": status.installationId,
          ...(status.authorityId ? { "X-Native-Authority-Id": status.authorityId } : {}),
          Authorization: `Native ${status.credential}`,
        },
      });
      if (response.ok && supportsNativeAuthorityGeneration(status)) {
        const revoked = await response.json().catch(() => null) as { authorityId?: unknown } | null;
        if (isNativeAuthorityId(revoked?.authorityId)) {
          send("native.authority.bind", { authorityId: revoked.authorityId });
        }
      }
    } catch (error) {
      console.warn("Native authority suspension failed open", error);
    } finally {
      setStatus((current) => current ? { ...current, nativeReady: false, engineHealthy: false } : current);
    }
  }, [send, status]);
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
    suspendNativeAuthority,
  }), [requestPermissions, requestStatus, scheduleTest, status, suspendNativeAuthority]);

  return <NativeAndroidContext.Provider value={value}>{children}</NativeAndroidContext.Provider>;
}

export function useNativeAndroid() {
  return useContext(NativeAndroidContext);
}
