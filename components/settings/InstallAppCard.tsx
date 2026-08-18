"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, MoreVertical, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Locale } from "@/lib/i18n/types";

const ANDROID_INSTALL_STEPS: Record<Locale, string> = {
  ar: "أندرويد: افتح قائمة المتصفح ⋮ ثم اختر «إضافة إلى الشاشة الرئيسية».",
  en: "Android: open the browser menu ⋮ and choose “Add to Home screen”.",
  de: "Android: Öffne das Browsermenü ⋮ und wähle „Zum Startbildschirm hinzufügen“.",
  tr: "Android: tarayıcı menüsünü ⋮ açın ve “Ana ekrana ekle”yi seçin.",
};

function standaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function InstallAppCard() {
  const { t, locale } = useTranslation();
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent>();

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
    if (!prompt || isAndroid) return;
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
          {installed ? <CheckCircle2 className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" /> : <Download className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />}
          {t("settings.installApp")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--app-text-secondary)]">
          {installed
            ? t("settings.appInstalled")
            : isIos
              ? t("settings.iosInstallInstructions")
              : t("settings.installAppDescription")}
        </p>
        {!installed && prompt && !isAndroid ? (
          <Button className="mt-3 w-full" onClick={() => void install()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("settings.install")}
          </Button>
        ) : null}
        {!installed && isAndroid ? (
          <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-[var(--app-surface-soft)] p-3 text-sm font-semibold leading-6 text-[var(--app-brand-strong)]" data-testid="android-add-to-home-instructions">
            <MoreVertical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{ANDROID_INSTALL_STEPS[locale]}</span>
          </div>
        ) : null}
        {!installed && isIos ? (
          <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-[var(--app-surface-soft)] p-3 text-sm font-semibold text-[var(--app-brand-strong)]">
            <Share2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t("notificationPrompt.iosSteps")}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
