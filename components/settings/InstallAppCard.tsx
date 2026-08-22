"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useNativeAndroid } from "@/components/providers/NativeAndroidProvider";
import { ANDROID_PUBLIC_DOWNLOAD_PATH } from "@/lib/android-release";
import { useTranslation } from "@/lib/i18n/use-translation";

function standaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function InstallAppCard() {
  const { t } = useTranslation();
  const { isNative } = useNativeAndroid();
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent>();
  const appInstalled = installed || isNative;

  useEffect(() => {
    const update = () => {
      setInstalled(standaloneMode());
      setIsIos(
        /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      );
      setIsAndroid(/Android/i.test(navigator.userAgent));
      setPrompt(window.__pwaInstallPrompt);
    };
    const markInstalled = () => {
      window.__pwaInstallPrompt = undefined;
      setPrompt(undefined);
      setInstalled(true);
    };
    update();
    window.addEventListener("pwa-install-available", update);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("pwa-install-available", update);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    window.__pwaInstallPrompt = undefined;
    setPrompt(undefined);
    if (choice.outcome === "accepted") setInstalled(true);
  };

  return (
    <section id="install-app" className="settings-group scroll-mt-24">
      <div className="settings-section">
        <h2 className="flex items-center gap-2">
          {appInstalled ? <CheckCircle2 className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" /> : <Download className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />}
          {t("settings.installApp")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--app-text-secondary)]">
          {appInstalled
            ? t("settings.appInstalled")
            : isIos
              ? t("settings.iosInstallInstructions")
              : t("settings.installAppDescription")}
        </p>
        {!appInstalled && prompt && !isAndroid ? (
          <Button className="mt-3 w-full" onClick={() => void install()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("settings.install")}
          </Button>
        ) : null}
        {!appInstalled && isAndroid ? (
          <Link
            href={ANDROID_PUBLIC_DOWNLOAD_PATH}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-card)] shadow-[var(--shadow-card)] transition active:scale-[0.98]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("settings.install")}
          </Link>
        ) : null}
        {!appInstalled && isIos ? (
          <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-[var(--app-surface-soft)] p-3 text-sm font-semibold text-[var(--app-brand-strong)]">
            <Share2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t("notificationPrompt.iosSteps")}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
