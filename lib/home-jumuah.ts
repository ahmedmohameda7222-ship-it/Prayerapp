import { todayIso } from "@/lib/date-utils";
import { resolveUpcomingFridaySchedule } from "@/lib/friday";
import type { FridayService, JumuahTime, PrayerTime } from "@/lib/types";

export type HomeJumuahSchedule = {
  date: string;
  items: FridayService[];
  daysUntil: number;
  nextIndex: number;
};

type HomeJumuahOptions = {
  allowAnyFutureFriday?: boolean;
};

function dayDiff(from: string, to: string) {
  const fromMs = Date.parse(`${from}T12:00:00Z`);
  const toMs = Date.parse(`${to}T12:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000);
}

export function getHomeJumuahSchedule(
  prayerTimes: PrayerTime[],
  jumuahTimes: JumuahTime[],
  now: Date,
  options: HomeJumuahOptions = {},
): HomeJumuahSchedule | undefined {
  const schedule = resolveUpcomingFridaySchedule(prayerTimes, jumuahTimes, now);
  if (!schedule) return undefined;

  const daysUntil = dayDiff(todayIso(now), schedule.date);
  if (daysUntil < 0 || (!options.allowAnyFutureFriday && daysUntil > 2)) return undefined;

  return {
    date: schedule.date,
    items: schedule.items,
    daysUntil,
    nextIndex: schedule.nextIndex,
  };
}
