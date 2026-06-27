import type { Locale } from "@/lib/i18n/types";

export const APP_TIME_ZONE = "Europe/Berlin";

const intlLocales: Record<Locale, string> = {
  ar: "ar",
  en: "en-GB",
  de: "de-DE",
  tr: "tr-TR",
};

function atNoonUtc(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

export function formatLongDate(date: string, locale: Locale = "ar") {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: APP_TIME_ZONE,
  }).format(atNoonUtc(date));
}

export function formatHijriDate(date: string, locale: Locale = "ar") {
  return new Intl.DateTimeFormat(`${intlLocales[locale]}-u-ca-islamic-umalqura`, {
    day: "numeric", month: "long", year: "numeric", timeZone: APP_TIME_ZONE,
  }).format(atNoonUtc(date));
}

export function formatShortDate(date: string, locale: Locale = "ar") {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    weekday: "short", day: "numeric", month: "short", timeZone: APP_TIME_ZONE,
  }).format(atNoonUtc(date));
}

export function formatDateRange(start: string, end: string, locale: Locale = "ar") {
  const formatter = new Intl.DateTimeFormat(intlLocales[locale], {
    day: "numeric", month: "short", year: "numeric", timeZone: APP_TIME_ZONE,
  });
  return `${formatter.format(atNoonUtc(start))} – ${formatter.format(atNoonUtc(end))}`;
}

export function todayIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: APP_TIME_ZONE,
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function addDaysIso(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function startOfWeekIso(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDaysIso(date, weekday === 0 ? -6 : 1 - weekday);
}

export function monthBoundsIso(date: string) {
  const [year, month] = date.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function addMonthsIso(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const maxDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, maxDay));
  return target.toISOString().slice(0, 10);
}

export function zonedDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  const offsetAt = (timestamp: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second)) - timestamp;
  };
  let timestamp = desiredUtc - offsetAt(desiredUtc);
  timestamp = desiredUtc - offsetAt(timestamp);
  return new Date(timestamp);
}
