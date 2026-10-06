import { addDaysIso } from "@/lib/date-utils";

export const ADMIN_PRAYER_TIMES_WINDOW_DAYS = 120;
export const ADMIN_PRAYER_TIMES_LOOKBACK_DAYS = 30;

export function prayerTimesWindowEnd(startDate: string) {
  return addDaysIso(startDate, ADMIN_PRAYER_TIMES_WINDOW_DAYS - 1);
}

export function shiftPrayerTimesWindow(startDate: string, direction: -1 | 1) {
  return addDaysIso(startDate, direction * ADMIN_PRAYER_TIMES_WINDOW_DAYS);
}

export function resetPrayerTimesWindow(runtimeToday: string) {
  return addDaysIso(runtimeToday, -ADMIN_PRAYER_TIMES_LOOKBACK_DAYS);
}

export function prayerTimesWindowLabel(startDate: string, endDate: string) {
  return `${startDate} – ${endDate}`;
}
