"use client";

import Link from "next/link";
import { Bell, ChevronRight, Clock } from "lucide-react";
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
    <div className="settings-group">
      <section className="settings-section">
        <h2 className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />
          {t("settings.notifications")}
        </h2>
        <p className="mt-1 text-sm leading-6">{t("settings.automaticContentNotifications")}</p>
        <p className="mt-3 rounded-[12px] bg-[var(--app-surface-soft)] p-3 text-sm font-semibold text-[var(--app-brand-strong)]" role="status">
          {t(statusKey)}
        </p>
        {pushStatus === "enabled" ? (
          <Button variant="ghost" className="mt-3 w-full" disabled={busy} onClick={() => void disableNotifications()}>{t("settings.disablePush")}</Button>
        ) : pushStatus === "disabled" || pushStatus === "error" ? (
          <Button className="mt-3 w-full" disabled={busy} onClick={() => void enableNotifications()}>{t("settings.enablePush")}</Button>
        ) : null}
      </section>

      <Link href="/#prayer-times" className="settings-section flex min-h-14 items-center gap-3">
        <Bell className="h-4 w-4 shrink-0 text-[var(--app-brand)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--app-text)]">{t("phase1.manageReminders")}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
      </Link>

      <section className="settings-section">
        <h2 className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />
          {t("settings.timeFormat")}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-[14px] bg-[var(--app-surface-soft)] p-1.5">
          {timeFormatOptions.map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeFormat(item.value)}
              aria-pressed={timeFormat === item.value}
              className={`min-h-11 rounded-[11px] px-3 text-sm font-semibold ${timeFormat === item.value ? "bg-[var(--app-surface)] text-[var(--app-brand-strong)] shadow-sm" : "text-[var(--app-text-secondary)]"}`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
