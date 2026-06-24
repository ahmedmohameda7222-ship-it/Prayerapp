import type { PrayerName, PrayerTime } from "./types";

export const prayerOrder: PrayerName[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

export const prayerLabels: Record<PrayerName, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export function getPrayerForDate(times: PrayerTime[], date: string) {
  return times.find((item) => item.date === date && item.published);
}

export function getIqama(prayer: PrayerTime, name: PrayerName) {
  if (name === "sunrise") return undefined;
  const key = `${name}Iqama` as keyof PrayerTime;
  return prayer[key] as string | undefined;
}

export function getNextPrayer(prayer: PrayerTime, now = new Date()) {
  const today = prayer.date;
  for (const name of prayerOrder) {
    const [hours, minutes] = prayer[name].split(":").map(Number);
    const target = new Date(`${today}T00:00:00+02:00`);
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() > now.getTime()) {
      return { name, time: prayer[name], target };
    }
  }

  const [hours, minutes] = prayer.fajr.split(":").map(Number);
  const target = new Date(`${today}T00:00:00+02:00`);
  target.setDate(target.getDate() + 1);
  target.setHours(hours, minutes, 0, 0);
  return { name: "fajr" as PrayerName, time: prayer.fajr, target };
}

export function formatCountdown(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
