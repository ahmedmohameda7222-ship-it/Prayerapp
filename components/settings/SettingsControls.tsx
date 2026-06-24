"use client";

import { useState } from "react";
import { Bell, Clock, Languages, Moon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/lib/i18n/context";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Locale } from "@/lib/i18n/types";

const languageOptions: { value: Locale; labelKey: string }[] = [
  { value: "ar", labelKey: "settings.arabic" },
  { value: "en", labelKey: "settings.english" },
  { value: "de", labelKey: "settings.german" },
  { value: "tr", labelKey: "settings.turkish" },
];

const timeFormatOptions = [
  { value: "24-hour", labelKey: "settings.24hour" },
  { value: "12-hour", labelKey: "settings.12hour" },
];

const notificationKeys = [
  "settings.prayerNotifications",
  "settings.iqamaNotifications",
  "settings.jumuahNotifications",
  "settings.announcementNotifications",
  "settings.azkarReminders",
];

export function SettingsControls() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const [timeFormat, setTimeFormat] = useState("24-hour");

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
          {notificationKeys.map((key, index) => (
            <label key={key} className="flex items-center justify-between rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold">
              {t(key)}
              <input
                type="checkbox"
                defaultChecked={index < 2}
                className="h-5 w-5 accent-[var(--color-emerald)]"
                aria-label={t(key)}
              />
            </label>
          ))}
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
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--color-emerald)]">
          <Moon className="h-5 w-5" aria-hidden="true" />
          {t("settings.theme")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button className="min-h-11 rounded-2xl bg-[var(--color-emerald)] text-sm font-bold text-[var(--color-card)]">
            {t("settings.light")}
          </button>
          <button className="min-h-11 rounded-2xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-muted)]" disabled>
            {t("settings.darkPlaceholder")}
          </button>
        </div>
      </Card>
    </div>
  );
}
