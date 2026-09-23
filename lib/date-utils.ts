import type { Locale } from "@/lib/i18n/types";

export const APP_TIME_ZONE = "Europe/Berlin";

const intlLocales: Record<Locale, string> = {
  ar: "ar",
  en: "en-GB",
  de: "de-DE",
  tr: "tr-TR",
};

export type HijriDatePart = {
  type: "day" | "month" | "year" | "era";
  value: string;
};

function atNoonUtc(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

export function formatLongDate(date: string, locale: Locale = "ar") {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: APP_TIME_ZONE,
  }).format(atNoonUtc(date));
}

export function formatHijriDateParts(date: string, locale: Locale = "ar"): HijriDatePart[] {
  const formatter = new Intl.DateTimeFormat(`${intlLocales[locale]}-u-ca-islamic-umalqura`, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
    ...(locale === "ar" ? { numberingSystem: "arab" } : {}),
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(atNoonUtc(date))
      .filter((part) => part.type === "day" || part.type === "month" || part.type === "year" || part.type === "era")
      .map((part) => [part.type, part.value]),
  );

  return (["day", "month", "year", "era"] as const)
    .filter((type) => typeof values[type] === "string")
    .map((type) => ({ type, value: values[type] as string }));
}

export function formatHijriDate(date: string, locale: Locale = "ar") {
  return formatHijriDateParts(date, locale).map((part) => part.value).join(" ");
}

export function formatShortDate(date: string, locale: Locale = "ar") {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    weekday: "short", day: "numeric", month: "short", timeZone: APP_TIME_ZONE,
  }).format(atNoonUtc(date));
}

export function formatDateRange(start: string, end: string, _locale: Locale = "ar") {
  const numericDate = (date: string) => {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  };
  return `${numericDate(start)} – ${numericDate(end)}`;
}

export function todayIso(now = new Date(), timeZone = APP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone,
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function formatDateTimeLocalInput(value?: string, timeZone = APP_TIME_ZONE) {
  if (!value) return "";
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function parseDateTimeLocalInput(value: string, timeZone = APP_TIME_ZONE) {
  const trimmed = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(trimmed);
  if (!match) throw new Error("Invalid datetime-local value");
  const [, date, time] = match;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const calendarCheck = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    throw new Error("Invalid datetime-local value");
  }
  const instant = zonedDateTime(date, time, timeZone);
  if (formatDateTimeLocalInput(instant.toISOString(), timeZone) !== trimmed) {
    throw new Error("Invalid or nonexistent datetime-local value");
  }
  return instant.toISOString();
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

export function zonedDateTime(date: string, time: string, timeZone = APP_TIME_ZONE) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  const partsAt = (timestamp: number) =>
    Object.fromEntries(
      formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]),
    );
  const offsetAt = (timestamp: number) => {
    const parts = partsAt(timestamp);
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    ) - timestamp;
  };
  const matchesDesiredWallTime = (timestamp: number) => {
    const parts = partsAt(timestamp);
    return (
      Number(parts.year) === year &&
      Number(parts.month) === month &&
      Number(parts.day) === day &&
      Number(parts.hour) === hour &&
      Number(parts.minute) === minute
    );
  };

  // Collect the offsets on both sides of any nearby transition. For an
  // overlap there are two valid instants for the same wall time; Android uses
  // ZonedDateTime.withLaterOffsetAtOverlap(), so choose the later instant here
  // as well for every accepted IANA timezone.
  const probeDeltas = [-48, -24, 0, 24, 48].map((hours) => hours * 60 * 60 * 1000);
  const offsets = new Set(probeDeltas.map((delta) => offsetAt(desiredUtc + delta)));
  const exactCandidates = Array.from(offsets)
    .map((offset) => desiredUtc - offset)
    .filter(matchesDesiredWallTime);

  if (exactCandidates.length > 0) {
    return new Date(Math.max(...exactCandidates));
  }

  // A nonexistent wall time is a forward DST gap. Match java.time's
  // ZonedDateTime.of behavior by shifting it forward by the gap, which is
  // equivalent to resolving the requested wall time with the pre-gap offset.
  const beforeOffset = offsetAt(desiredUtc - 48 * 60 * 60 * 1000);
  const afterOffset = offsetAt(desiredUtc + 48 * 60 * 60 * 1000);
  if (afterOffset > beforeOffset) {
    return new Date(desiredUtc - beforeOffset);
  }

  // Defensive fallback for unusual historical transitions not captured by
  // the probes above. Preserve the previous iterative resolver semantics.
  let timestamp = desiredUtc - offsetAt(desiredUtc);
  timestamp = desiredUtc - offsetAt(timestamp);
  return new Date(timestamp);
}
