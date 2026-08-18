"use client";

import { useEffect, useState } from "react";
import { Download, MoreVertical, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Locale } from "@/lib/i18n/types";

const ANDROID_INSTALL_STEPS: Record<Locale, string> = {
  ar: "افتح قائمة المتصفح ⋮ ثم اختر «إضافة إلى الشاشة الرئيسية».",
  en: "Open the browser menu ⋮ and choose “Add to Home screen”.",
  de: "Öffne das Browsermenü ⋮ und wähle „Zum Startbildschirm hinzufügen“.",
  tr: "Tarayıcı menüsünü ⋮ açın ve “Ana ekrana ekle”yi seçin.",
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export function HomeInstallAction() {
  const { t, locale } = useTranslation();
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent>();
  const [androidGuideOpen, setAndroidGuideOpen] = useState(false);

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
      setAndroidGuideOpen(false);
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
    // Android Chromium-family browsers can package an installable PWA as a
    // generated WebAPK. Do not force that generated APK flow from our CTA;
    // keep Android on the browser's explicit Add-to-Home path instead.
    if (isAndroid()) {
      setAndroidGuideOpen(true);
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
    <>
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

      {androidGuideOpen ? (
        <div className="fixed inset-0 z-[160] flex items-end justify-center sm:items-center" data-testid="android-add-to-home-dialog">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("common.close")}
            onClick={() => setAndroidGuideOpen(false)}
          />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-md rounded-t-[22px] border border-[var(--app-divider)] bg-[var(--app-surface)] px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:rounded-[22px] sm:pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-extrabold text-[var(--app-text)]">{t("settings.installApp")}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--app-text-secondary)]">{t("settings.installAppDescription")}</p>
              </div>
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={() => setAndroidGuideOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--app-surface-soft)] text-[var(--app-text-secondary)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-[12px] bg-[var(--app-surface-soft)] p-3 text-sm font-bold text-[var(--app-brand-strong)]">
              <MoreVertical className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{ANDROID_INSTALL_STEPS[locale]}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
