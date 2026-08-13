import { todayIso, zonedDateTime } from "@/lib/date-utils";
import type { JumuahTime } from "@/lib/types";

export type HomeJumuahSchedule = {
  date: string;
  items: JumuahTime[];
  daysUntil: 0 | 1 | 2;
  nextIndex: number;
};

function dayDiff(from: string, to: string) {
  const fromMs = Date.parse(`${from}T12:00:00Z`);
  const toMs = Date.parse(`${to}T12:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000);
}

function isFriday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 5;
}

export function getHomeJumuahSchedule(jumuahTimes: JumuahTime[], now: Date): HomeJumuahSchedule | undefined {
  const today = todayIso(now);
  const published = jumuahTimes
    .filter((item) => item.published && item.date >= today && isFriday(item.date))
    .sort((a, b) => `${a.date}T${a.prayerTime}`.localeCompare(`${b.date}T${b.prayerTime}`));

  const candidateDate = published.find((item) => {
    const diff = dayDiff(today, item.date);
    return diff >= 0 && diff <= 2;
  })?.date;

  if (!candidateDate) return undefined;

  const items = published
    .filter((item) => item.date === candidateDate)
    .sort((a, b) => a.prayerTime.localeCompare(b.prayerTime));
  const daysUntil = dayDiff(today, candidateDate) as 0 | 1 | 2;

  if (daysUntil === 0) {
    const nextIndex = items.findIndex((item) => zonedDateTime(candidateDate, item.prayerTime).getTime() >= now.getTime());
    if (nextIndex === -1) return undefined;
    return { date: candidateDate, items, daysUntil, nextIndex };
  }

  return { date: candidateDate, items, daysUntil, nextIndex: 0 };
}
