import type { Locale } from "@/lib/i18n/types";

const intlLocales: Record<Locale, string> = {
  ar: "ar",
  en: "en-GB",
  de: "de-DE",
  tr: "tr-TR",
};

export function formatLongDate(date: string, locale: Locale = "ar") {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date(`${date}T12:00:00+02:00`));
}

export function formatShortDate(date: string, locale: Locale = "ar") {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(`${date}T12:00:00+02:00`));
}

export function todayIso() {
  return "2026-06-24";
}
