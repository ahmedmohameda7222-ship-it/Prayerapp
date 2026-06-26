"use client";

import { Bell, Clock, Languages, Moon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/lib/i18n/context";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";
import type { Locale } from "@/lib/i18n/types";
import { useAppPreferences, type NotificationPreferenceKey } from "@/components/providers/AppPreferencesProvider";

const languageOptions: { value: Locale; labelKey: string }[] = [
  { value: "ar", labelKey: "settings.arabic" },
  { value: "en", labelKey: "settings.english" },
  { value: "de", labelKey: "settings.german" },
  { value: "tr", labelKey: "settings.turkish" },
];

const timeFormatOptions = [
  { value: "24-hour" as const, labelKey: "settings.24hour" },
  { value: "12-hour" as const, labelKey: "settings.12hour" },
];

const notificationKeys: Array<{ key: NotificationPreferenceKey; label: string }> = [
  { key: "prayer", label: "settings.prayerNotifications" },
  { key: "iqama", label: "settings.iqamaNotifications" },
  { key: "jumuah", label: "settings.jumuahNotifications" },
  { key: "announcements", label: "settings.announcementNotifications" },
  { key: "azkar", label: "settings.azkarReminders" },
];

export function SettingsControls() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const { timeFormat, setTimeFormat } = useTimeFormat();
  const { theme, setTheme, notifications, setNotification, permission, requestNotificationPermission } = useAppPreferences();

  return (
    <div className="grid gap-5">
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--color-emerald)]">
          <Languages className="h-5 w-5" aria-hidden="true" />
          {t("settings.language")}
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {languageOptions.map((item) => (
            <button
              key={item.value}
              onClick={() => setLocale(item.value)}
              aria-pressed={locale === item.value}
              className={`min-h-11 rounded-2xl border px-2 text-sm font-bold transition ${
                locale === item.value
                  ? "border-[var(--color-emerald)] bg-[var(--color-emerald)] text-[var(--color-card)]"
                  : "border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-emerald)]"
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--color-emerald)]">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {t("settings.notifications")}
        </h2>
        <div className="grid gap-3">
          {notificationKeys.map((item) => (
            <label key={item.key} className="flex items-center justify-between rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold">
              {t(item.label)}
              <input
                type="checkbox"
                checked={notifications[item.key]}
                onChange={(event) => setNotification(item.key, event.target.checked)}
                className="h-5 w-5 accent-[var(--color-emerald)]"
                aria-label={t(item.label)}
              />
            </label>
          ))}
        </div>
        <button type="button" onClick={requestNotificationPermission} disabled={permission === "granted" || permission === "unsupported"} className="mt-3 min-h-11 w-full rounded-2xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-emerald)] disabled:opacity-60">
          {permission === "granted" ? t("settings.browserNotificationsEnabled") : permission === "unsupported" ? t("settings.browserNotificationsUnsupported") : t("settings.enableBrowserNotifications")}
        </button>
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
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--color-emerald)]">
          <Moon className="h-5 w-5" aria-hidden="true" />
          {t("settings.theme")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTheme("light")} aria-pressed={theme === "light"} className={`min-h-11 rounded-2xl text-sm font-bold ${theme === "light" ? "bg-[var(--color-emerald)] text-[var(--color-card)]" : "border border-[var(--color-border)] text-[var(--color-emerald)]"}`}>
            {t("settings.light")}
          </button>
          <button type="button" onClick={() => setTheme("dark")} aria-pressed={theme === "dark"} className={`min-h-11 rounded-2xl text-sm font-bold ${theme === "dark" ? "bg-[var(--color-emerald)] text-[var(--color-card)]" : "border border-[var(--color-border)] text-[var(--color-emerald)]"}`}>
            {t("settings.dark")}
          </button>
        </div>
      </Card>
    </div>
  );
}
