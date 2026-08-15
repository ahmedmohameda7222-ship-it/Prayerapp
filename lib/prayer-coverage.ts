import type { PrayerTime } from "@/lib/types";
import { addDaysIso } from "@/lib/date-utils";

export function getMissingPublishedPrayerDates(
  times: PrayerTime[],
  startDate: string,
  days = 7,
) {
  const publishedDates = new Set(
    times.filter((item) => item.published).map((item) => item.date),
  );
  return Array.from({ length: days }, (_, index) => addDaysIso(startDate, index))
    .filter((date) => !publishedDates.has(date));
}
