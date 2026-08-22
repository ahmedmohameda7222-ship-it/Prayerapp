"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useNativeAndroid } from "@/components/providers/NativeAndroidProvider";
import { parsePublicAndroidRelease, type PublicAndroidRelease } from "@/lib/android-release";
import { classifyAndroidUpdate, type AndroidUpdateKind } from "@/lib/android-update";
import { useTranslation } from "@/lib/i18n/use-translation";

export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const LAST_CHECK_KEY = "danube-android-update-last-check-v1";

type ContextValue = {
  isNative: boolean;
  installedVersionName: string | null;
  latestVersionName: string | null;
  updateKind: AndroidUpdateKind | "unknown";
  checking: boolean;
  error: boolean;
  checkForUpdates: (manual?: boolean) => Promise<void>;
  dismissUpdate: () => void;
  openUpdate: () => void;
};

const AndroidUpdateContext = createContext<ContextValue>({
  isNative: false,
  installedVersionName: null,
  latestVersionName: null,
  updateKind: "unknown",
  checking: false,
  error: false,
  checkForUpdates: async () => undefined,
  dismissUpdate: () => undefined,
  openUpdate: () => undefined,
});

export function AndroidUpdateProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isNative, status, suspendNativeAuthority } = useNativeAndroid();
  const [release, setRelease] = useState<PublicAndroidRelease | null>(null);
  const [updateKind, setUpdateKind] = useState<AndroidUpdateKind | "unknown">("unknown");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);
  const [dismissedVersionCode, setDismissedVersionCode] = useState<number | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const suspendedVersionRef = useRef<number | null>(null);
  const installedVersionCode = Number.isSafeInteger(status?.versionCode) && (status?.versionCode || 0) > 0
    ? status!.versionCode
    : null;

  const checkForUpdates = useCallback(async (manual = false) => {
    if (!isNative || installedVersionCode === null) return;
    const lastCheckedAt = Number(localStorage.getItem(LAST_CHECK_KEY) || "0");
    if (!manual && Date.now() - lastCheckedAt < UPDATE_CHECK_INTERVAL_MS) return;
    if (requestRef.current) return requestRef.current;

    const request = (async () => {
      setChecking(true);
      setError(false);
      try {
        if (!navigator.onLine) throw new Error("offline");
        const response = await fetch("/api/android/release", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`release-${response.status}`);
        const parsed = parsePublicAndroidRelease(await response.json().catch(() => null));
        if (!parsed) throw new Error("release-invalid");
        localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        const nextKind = classifyAndroidUpdate(installedVersionCode, parsed);
        setRelease(parsed);
        setUpdateKind(nextKind);
        if (nextKind === "required" && suspendedVersionRef.current !== parsed.versionCode) {
          suspendedVersionRef.current = parsed.versionCode;
          await suspendNativeAuthority();
        }
      } catch {
        setError(true);
      } finally {
        setChecking(false);
      }
    })();
    requestRef.current = request;
    try {
      await request;
    } finally {
      requestRef.current = null;
    }
  }, [installedVersionCode, isNative, suspendNativeAuthority]);

  useEffect(() => {
    if (!isNative || installedVersionCode === null) return;
    void checkForUpdates(false);
  }, [checkForUpdates, installedVersionCode, isNative]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkForUpdates(false);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [checkForUpdates]);

  const dismissUpdate = useCallback(() => {
    if (!release || updateKind !== "optional") return;
    setDismissedVersionCode(release.versionCode);
  }, [release, updateKind]);

  const openUpdate = useCallback(() => {
    window.location.assign("/download/android");
  }, []);

  const showPrompt = isNative && release && (
    updateKind === "required"
    || (updateKind === "optional" && dismissedVersionCode !== release.versionCode)
  );
  const value = useMemo<ContextValue>(() => ({
    isNative,
    installedVersionName: status?.versionName || null,
    latestVersionName: release?.versionName || null,
    updateKind,
    checking,
    error,
    checkForUpdates,
    dismissUpdate,
    openUpdate,
  }), [checkForUpdates, checking, dismissUpdate, error, isNative, openUpdate, release?.versionName, status?.versionName, updateKind]);

  return (
    <AndroidUpdateContext.Provider value={value}>
      {children}
      {showPrompt ? (
        <aside
          className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-lg rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-2xl"
          role="dialog"
          aria-modal={updateKind === "required"}
          aria-labelledby="android-update-title"
        >
          <h2 id="android-update-title" className="font-bold text-[var(--app-text)]">
            {updateKind === "required" ? t("settings.androidUpdateRequiredTitle") : t("settings.androidUpdateTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--app-text-secondary)]">
            {updateKind === "required" ? t("settings.androidUpdateRequiredBody") : t("settings.androidUpdateBody")}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button className={updateKind === "required" ? "col-span-2" : ""} onClick={openUpdate}>
              {t("settings.androidUpdateNow")}
            </Button>
            {updateKind === "optional" ? (
              <Button variant="ghost" onClick={dismissUpdate}>{t("settings.androidUpdateLater")}</Button>
            ) : null}
          </div>
        </aside>
      ) : null}
    </AndroidUpdateContext.Provider>
  );
}

export function useAndroidUpdate() {
  return useContext(AndroidUpdateContext);
}
