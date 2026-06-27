"use client";

import { Bell, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import type { PrayerReminderMinutes } from "@/lib/push/types";

const timeFormatOptions = [
  { value: "24-hour" as const, labelKey: "settings.24hour" },
  { value: "12-hour" as const, labelKey: "settings.12hour" },
];

const reminderOptions: Array<{ value: PrayerReminderMinutes; labelKey: string; minutes?: number }> = [
  { value: null, labelKey: "settings.reminderOff" },
  { value: 0, labelKey: "settings.reminderAtAzan" },
  { value: 5, labelKey: "settings.reminderBeforeMinutes", minutes: 5 },
  { value: 10, labelKey: "settings.reminderBeforeMinutes", minutes: 10 },
  { value: 15, labelKey: "settings.reminderBeforeMinutes", minutes: 15 },
  { value: 30, labelKey: "settings.reminderBeforeMinutes", minutes: 30 },
];

export function SettingsControls() {
  const { t } = useTranslation();
  const { timeFormat, setTimeFormat } = useTimeFormat();
  const {
    pushStatus,
    prayerReminderMinutes,
    busy,
    enableNotifications,
    disableNotifications,
    setPrayerReminderMinutes,
  } = useAppPreferences();

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
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">
          {t("settings.automaticContentNotifications")}
        </p>
        <p className="mt-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]" role="status">
          {t(statusKey)}
        </p>
        {pushStatus === "enabled" ? (
          <Button variant="ghost" className="mt-3 w-full" disabled={busy} onClick={() => void disableNotifications()}>
            {t("settings.disablePush")}
          </Button>
        ) : pushStatus === "disabled" || pushStatus === "error" ? (
          <Button className="mt-3 w-full" disabled={busy} onClick={() => void enableNotifications()}>
            {t("settings.enablePush")}
          </Button>
        ) : null}

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <label htmlFor="prayer-reminder" className="text-sm font-bold text-[var(--color-emerald)]">
            {t("settings.prayerReminderTiming")}
          </label>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
            {t("settings.prayerReminderDescription")}
          </p>
          <select
            id="prayer-reminder"
            value={prayerReminderMinutes === null ? "off" : String(prayerReminderMinutes)}
            onChange={(event) => {
              const value = event.target.value;
              void setPrayerReminderMinutes(value === "off" ? null : Number(value) as PrayerReminderMinutes);
            }}
            className="mt-3 min-h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-sm font-bold text-[var(--color-emerald)]"
          >
            {reminderOptions.map((option) => (
              <option key={option.value ?? "off"} value={option.value ?? "off"}>
                {t(option.labelKey, option.minutes ? { minutes: option.minutes } : undefined)}
              </option>
            ))}
          </select>
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
              className={`min-h-11 rounded-2xl border text-sm font-bold transition ${
                timeFormat === item.value
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-emerald-dark)]"
                  : "border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-emerald)]"
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
