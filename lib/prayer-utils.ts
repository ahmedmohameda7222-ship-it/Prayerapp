import type { PrayerName, PrayerTime } from "./types";
import { addDaysIso, zonedDateTime } from "./date-utils";

export const prayerOrder: PrayerName[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

export function getPrayerForDate(times: PrayerTime[], date: string) {
  return times.find((item) => item.date === date && item.published);
}

export function getIqama(prayer: PrayerTime, name: PrayerName) {
  if (name === "sunrise") return undefined;
  return prayer[`${name}Iqama` as keyof PrayerTime] as string | undefined;
}

export function getNextPrayerFromSchedule(times: PrayerTime[], now = new Date()) {
  const schedule = times.filter((item) => item.published).sort((a, b) => a.date.localeCompare(b.date));
  for (const day of schedule) {
    for (const name of prayerOrder) {
      const target = zonedDateTime(day.date, day[name]);
      if (target.getTime() > now.getTime()) return { name, time: day[name], target, date: day.date };
    }
  }
  return undefined;
}

export function getNextPrayer(prayer: PrayerTime, now = new Date()) {
  const next = getNextPrayerFromSchedule([prayer], now);
  if (next) return next;
  const target = zonedDateTime(addDaysIso(prayer.date, 1), prayer.fajr);
  return { name: "fajr" as PrayerName, time: prayer.fajr, target, date: addDaysIso(prayer.date, 1) };
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
