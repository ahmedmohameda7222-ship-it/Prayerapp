"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Share2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";

function standaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function InstallAppCard() {
  const { t } = useTranslation();
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent>();

  useEffect(() => {
    const update = () => {
      setInstalled(standaloneMode());
      setIsIos(
        /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      );
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

  if (!installed && !isIos && !prompt) return null;

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    window.__pwaInstallPrompt = undefined;
    setPrompt(undefined);
    if (choice.outcome === "accepted") setInstalled(true);
  };

  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 font-bold text-[var(--color-emerald)]">
        {installed ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Download className="h-5 w-5" aria-hidden="true" />}
        {t("settings.installApp")}
      </h2>
      <p className="text-sm leading-6 text-[var(--color-text-muted)]">
        {installed
          ? t("settings.appInstalled")
          : isIos
            ? t("settings.iosInstallInstructions")
            : t("settings.installAppDescription")}
      </p>
      {!installed && prompt ? (
        <Button className="mt-3 w-full" onClick={() => void install()}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {t("settings.install")}
        </Button>
      ) : null}
      {!installed && isIos ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]">
          <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Safari → Share → Add to Home Screen
        </div>
      ) : null}
    </Card>
  );
}
