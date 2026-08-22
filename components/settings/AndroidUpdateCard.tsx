"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAndroidUpdate } from "@/components/providers/AndroidUpdateProvider";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AndroidUpdateCard() {
  const { t } = useTranslation();
  const {
    isNative,
    installedVersionName,
    latestVersionName,
    updateKind,
    checking,
    error,
    checkForUpdates,
    openUpdate,
  } = useAndroidUpdate();
  if (!isNative) return null;

  const status = error
    ? t("settings.androidUpdateError")
    : updateKind === "required"
      ? t("settings.androidUpdateRequiredStatus")
      : updateKind === "optional"
        ? t("settings.androidUpdateAvailableStatus")
        : updateKind === "current"
          ? t("settings.androidUpdateCurrentStatus")
          : t("settings.androidUpdateUnknownStatus");

  return (
    <section className="settings-section">
      <h2 className="flex items-center gap-2">
        <Download className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />
        {t("settings.androidUpdateSection")}
      </h2>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between gap-3"><dt>{t("settings.androidInstalledVersion")}</dt><dd className="font-semibold">{installedVersionName || "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt>{t("settings.androidLatestVersion")}</dt><dd className="font-semibold">{latestVersionName || "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt>{t("settings.androidUpdateStatus")}</dt><dd className="text-end font-semibold">{status}</dd></div>
      </dl>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="ghost" disabled={checking} onClick={() => void checkForUpdates(true)}>
          {checking ? t("settings.androidUpdateChecking") : t("settings.androidCheckForUpdates")}
        </Button>
        {updateKind === "optional" || updateKind === "required" ? (
          <Button onClick={openUpdate}>{t("settings.androidUpdateNow")}</Button>
        ) : null}
      </div>
    </section>
  );
}
