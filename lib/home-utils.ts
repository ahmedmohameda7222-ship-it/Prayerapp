import { todayIso, zonedDateTime } from "./date-utils";
import { getPrayerForDate } from "./prayer-utils";
import type { PrayerName, PrayerTime } from "./types";

export type SmartNextAction = "afterPrayer" | "morning" | "evening" | "sleep" | "friday";

const obligatoryPrayers: PrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const AFTER_PRAYER_WINDOW_MS = 45 * 60 * 1000;

export function getSmartNextAction(times: PrayerTime[], now = new Date()): SmartNextAction {
  const today = getPrayerForDate(times, todayIso(now));

  const latestPrayer = times
    .filter((item) => item.published)
    .flatMap((item) => obligatoryPrayers.map((name) => zonedDateTime(item.date, item[name])))
    .filter((target) => target.getTime() <= now.getTime())
    .reduce<Date | undefined>((latest, target) => !latest || target > latest ? target : latest, undefined);

  if (latestPrayer && now.getTime() - latestPrayer.getTime() <= AFTER_PRAYER_WINDOW_MS) {
    return "afterPrayer";
  }

  if (!today) return "morning";

  const fajr = zonedDateTime(today.date, today.fajr);
  const sunrise = zonedDateTime(today.date, today.sunrise);
  const asr = zonedDateTime(today.date, today.asr);
  const isha = zonedDateTime(today.date, today.isha);
  const isFriday = new Date(`${today.date}T12:00:00Z`).getUTCDay() === 5;

  if (now < fajr || now >= isha) return "sleep";
  if (isFriday && now >= sunrise && now < asr) return "friday";
  if (now >= asr) return "evening";
  return "morning";
}
