"use client";

import Link from "next/link";
import { Bell, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";

const timeFormatOptions = [
  { value: "24-hour" as const, labelKey: "settings.24hour" },
  { value: "12-hour" as const, labelKey: "settings.12hour" },
];

export function SettingsControls() {
  const { t } = useTranslation();
  const { timeFormat, setTimeFormat } = useTimeFormat();
  const { pushStatus, busy, enableNotifications, disableNotifications } = useAppPreferences();

  const statusKey = {
    checking: "settings.pushChecking",
    unsupported: "settings.pushUnsupported",
    "ios-install-required": "settings.pushIosInstallRequired",
    unconfigured: "settings.pushUnavailable",
    denied: "settings.pushDenied",
    disabled: "settings.pushDisabled",
    enabled: "settings.pushEnabled",
    error: "settings.pushError",
  }[pushStatus];

  return (
    <div className="grid gap-5">
      <Card>
        <h2 className="mb-2 flex items-center gap-2 font-bold text-[var(--color-emerald)]">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {t("settings.notifications")}
        </h2>
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">{t("settings.automaticContentNotifications")}</p>
        <p className="mt-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]" role="status">{t(statusKey)}</p>
        {pushStatus === "enabled" ? (
          <Button variant="ghost" className="mt-3 w-full" disabled={busy} onClick={() => void disableNotifications()}>{t("settings.disablePush")}</Button>
        ) : pushStatus === "disabled" || pushStatus === "error" ? (
          <Button className="mt-3 w-full" disabled={busy} onClick={() => void enableNotifications()}>{t("settings.enablePush")}</Button>
        ) : null}
        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <p className="text-sm font-bold text-[var(--color-emerald)]">{t("phase1.reminderDescription")}</p>
          <Link href="/#prayer-times" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-[var(--color-gold-dark)]">{t("phase1.manageReminders")}</Link>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--color-emerald)]">
          <Clock className="h-5 w-5" aria-hidden="true" />
          {t("settings.timeFormat")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {timeFormatOptions.map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeFormat(item.value)}
              aria-pressed={timeFormat === item.value}
              className={`min-h-11 rounded-2xl border text-sm font-bold transition ${timeFormat === item.value ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-emerald-dark)]" : "border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-emerald)]"}`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
