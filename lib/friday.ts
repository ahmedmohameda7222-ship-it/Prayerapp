import { todayIso, zonedDateTime } from "@/lib/date-utils";
import type { JumuahTime } from "@/lib/types";

export type FridaySchedule = {
  date: string;
  items: JumuahTime[];
  nextIndex: number;
  isToday: boolean;
};

function isFriday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 5;
}

export function getUpcomingFridaySchedule(
  jumuahTimes: JumuahTime[],
  now: Date,
): FridaySchedule | undefined {
  const today = todayIso(now);
  const published = jumuahTimes
    .filter((item) => item.published && item.date >= today && isFriday(item.date))
    .sort((a, b) => `${a.date}T${a.prayerTime}`.localeCompare(`${b.date}T${b.prayerTime}`));

  const candidateDates = [...new Set(published.map((item) => item.date))];

  for (const date of candidateDates) {
    const items = published
      .filter((item) => item.date === date)
      .sort((a, b) => a.prayerTime.localeCompare(b.prayerTime));

    if (!items.length) continue;

    if (date === today) {
      const nextIndex = items.findIndex(
        (item) => zonedDateTime(date, item.prayerTime).getTime() >= now.getTime(),
      );
      if (nextIndex === -1) continue;
      return { date, items, nextIndex, isToday: true };
    }

    return { date, items, nextIndex: 0, isToday: false };
  }

  return undefined;
}
