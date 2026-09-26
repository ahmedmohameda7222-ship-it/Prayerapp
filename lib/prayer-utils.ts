import type { ObligatoryPrayerName, PrayerIqamaTimes, PrayerName, PrayerTime } from "./types";
import type { PrayerIqamaDelays } from "./prayer-engine/types";
import { zonedDateTime } from "./date-utils";
import { isFridayIso } from "./friday";

export const prayerOrder: PrayerName[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];
export const obligatoryPrayerOrder: ObligatoryPrayerName[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

export function getPrayerForDate(times: PrayerTime[], date: string) {
  return times.find((item) => item.date === date && item.published);
}

export function deriveIqamaInstant(
  prayerDate: string,
  prayerTime: string,
  delayMinutes: number,
  timezone: string,
): Date {
  if (!Number.isInteger(delayMinutes) || delayMinutes < 0) {
    throw new Error("Invalid Iqama delay");
  }
  return new Date(
    zonedDateTime(prayerDate, prayerTime, timezone).getTime() + delayMinutes * 60_000,
  );
}

function localTime(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/** Root Prayerapp presentation adapter for the five shared Iqama delays. */
export function derivePrayerIqamaTimes(
  prayer: PrayerTime,
  delays: PrayerIqamaDelays,
  timezone: string,
): PrayerIqamaTimes {
  const result: PrayerIqamaTimes = {};
  for (const name of obligatoryPrayerOrder) {
    if (name === "dhuhr" && isFridayIso(prayer.date)) continue;
    result[name] = localTime(deriveIqamaInstant(prayer.date, prayer[name], delays[name], timezone), timezone);
  }
  return result;
}

export function getNextPrayerFromSchedule(times: PrayerTime[], now: Date, timezone: string) {
  const schedule = times
    .filter((item) => item.published)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const day of schedule) {
    for (const name of obligatoryPrayerOrder) {
      const target = zonedDateTime(day.date, day[name], timezone);
      if (target.getTime() > now.getTime()) {
        return { name, time: day[name], target, date: day.date };
      }
    }
  }
  return undefined;
}

// This helper intentionally does not invent tomorrow's Fajr from today's row.
// Callers that need rollover behavior must pass a multi-day schedule to
// getNextPrayerFromSchedule so tomorrow's actual published time is used.
export function getNextPrayer(prayer: PrayerTime, now: Date, timezone: string) {
  return getNextPrayerFromSchedule([prayer], now, timezone);
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
