"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
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

  if (!ready || installed) return null;

  async function installOrExplain() {
    // On Android, Chrome/Samsung can package an installable PWA as a WebAPK.
    // Keep our own CTA on the browser's Add-to-Home guidance path instead of
    // forcing that generated APK install flow from JavaScript.
    if (isAndroid()) {
      window.location.assign("/settings#install-app");
      return;
    }

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
