"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useNativeAndroid } from "@/components/providers/NativeAndroidProvider";
import { ANDROID_PUBLIC_DOWNLOAD_PATH } from "@/lib/android-release";
import { useTranslation } from "@/lib/i18n/use-translation";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export function HomeInstallAction() {
  const { t } = useTranslation();
  const { isNative } = useNativeAndroid();
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent>();

  useEffect(() => {
    const refresh = () => {
      setInstalled(isStandalone());
      setPrompt(window.__pwaInstallPrompt);
      setReady(true);
    };
    const markInstalled = () => {
      window.__pwaInstallPrompt = undefined;
      setPrompt(undefined);
      setInstalled(true);
      setReady(true);
    };

    refresh();
    window.addEventListener("pwa-install-available", refresh);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("pwa-install-available", refresh);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  if (!ready || installed || isNative) return null;

  if (isAndroid()) {
    return (
      <a
        href={ANDROID_PUBLIC_DOWNLOAD_PATH}
        aria-label={t("settings.installApp")}
        title={t("settings.installApp")}
        className="grid h-11 w-11 place-items-center rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
        data-testid="home-install-app"
      >
        <Download className="h-5 w-5" aria-hidden="true" />
      </a>
    );
  }

  async function installOrExplain() {
    const currentPrompt = prompt || window.__pwaInstallPrompt;
    if (!currentPrompt) {
      window.location.assign("/settings#install-app");
      return;
    }

    try {
      await currentPrompt.prompt();
      const choice = await currentPrompt.userChoice;
      window.__pwaInstallPrompt = undefined;
      setPrompt(undefined);
      if (choice.outcome === "accepted") setInstalled(true);
      else window.location.assign("/settings#install-app");
    } catch {
      window.location.assign("/settings#install-app");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void installOrExplain()}
      aria-label={t("settings.installApp")}
      title={t("settings.installApp")}
      className="grid h-11 w-11 place-items-center rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
      data-testid="home-install-app"
    >
      <Download className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
