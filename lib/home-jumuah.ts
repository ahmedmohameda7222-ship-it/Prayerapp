import { todayIso, zonedDateTime } from "@/lib/date-utils";
import type { JumuahTime } from "@/lib/types";

export type HomeJumuahSchedule = {
  date: string;
  items: JumuahTime[];
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

function isFriday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 5;
}

export function getHomeJumuahSchedule(
  jumuahTimes: JumuahTime[],
  now: Date,
  options: HomeJumuahOptions = {},
): HomeJumuahSchedule | undefined {
  const today = todayIso(now);
  const published = jumuahTimes
    .filter((item) => item.published && item.date >= today && isFriday(item.date))
    .sort((a, b) => `${a.date}T${a.prayerTime}`.localeCompare(`${b.date}T${b.prayerTime}`));
  const candidateDates = [...new Set(published.map((item) => item.date))]
    .filter((date) => {
      const diff = dayDiff(today, date);
      return diff >= 0 && (options.allowAnyFutureFriday || diff <= 2);
    });

  for (const candidateDate of candidateDates) {
    const items = published
      .filter((item) => item.date === candidateDate)
      .sort((a, b) => a.prayerTime.localeCompare(b.prayerTime));
    const daysUntil = dayDiff(today, candidateDate);

    if (daysUntil === 0) {
      const nextIndex = items.findIndex((item) => zonedDateTime(candidateDate, item.prayerTime).getTime() >= now.getTime());
      if (nextIndex === -1) continue;
      return { date: candidateDate, items, daysUntil, nextIndex };
    }

    return { date: candidateDate, items, daysUntil, nextIndex: 0 };
  }

  return undefined;
}
