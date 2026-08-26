import { todayIso, zonedDateTime } from "@/lib/date-utils";
import type { FridaySchedule, FridayService, JumuahTime, PrayerTime } from "@/lib/types";

export const FRIDAY_IMMINENT_WINDOW_MS = 5 * 60 * 1000;

export type FridayLivePrayer = {
  item: FridayService;
  index: number;
  target: Date;
  remainingMs: number;
  imminent: boolean;
};

export function isFridayIso(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 5;
}

function additionalService(item: JumuahTime): FridayService {
  return {
    id: item.id,
    date: item.date,
    prayerTime: item.prayerTime,
    source: "jumuah-times",
    editable: true,
    locationName: item.locationName,
    locationAddress: item.locationAddress,
    khateebName: item.khateebName,
    language: item.language,
    languageAr: item.languageAr,
    languageEn: item.languageEn,
    languageDe: item.languageDe,
    languageTr: item.languageTr,
    notes: item.notes,
    notesAr: item.notesAr,
    notesEn: item.notesEn,
    notesDe: item.notesDe,
    notesTr: item.notesTr,
  };
}

export function getValidAdditionalFridayServices(
  date: string,
  primaryTime: string,
  jumuahTimes: JumuahTime[],
): FridayService[] {
  const seenTimes = new Set<string>();

  return jumuahTimes
    .filter((item) => item.published && item.date === date && isFridayIso(item.date))
    .sort((a, b) => a.prayerTime.localeCompare(b.prayerTime) || a.id.localeCompare(b.id))
    .filter((item) => {
      if (item.prayerTime <= primaryTime || seenTimes.has(item.prayerTime)) return false;
      seenTimes.add(item.prayerTime);
      return true;
    })
    .map(additionalService);
}

function primaryService(prayerTime: PrayerTime): FridayService {
  return {
    id: `primary:${prayerTime.date}`,
    date: prayerTime.date,
    prayerTime: prayerTime.dhuhr,
    source: "prayer-times",
    editable: false,
  };
}

export function resolveUpcomingFridaySchedule(
  prayerTimes: PrayerTime[],
  jumuahTimes: JumuahTime[],
  now: Date,
): FridaySchedule | undefined {
  const today = todayIso(now);
  const fridayPrayerRows = prayerTimes
    .filter((row) => row.published && row.date >= today && isFridayIso(row.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const prayerRow of fridayPrayerRows) {
    const items = [
      primaryService(prayerRow),
      ...getValidAdditionalFridayServices(prayerRow.date, prayerRow.dhuhr, jumuahTimes),
    ];

    if (prayerRow.date === today) {
      const nextIndex = items.findIndex(
        (item) => zonedDateTime(prayerRow.date, item.prayerTime).getTime() >= now.getTime(),
      );
      if (nextIndex === -1) continue;
      return { date: prayerRow.date, items, nextIndex, isToday: true };
    }

    return { date: prayerRow.date, items, nextIndex: 0, isToday: false };
  }

  return undefined;
}

/**
 * Compatibility adapter for public surfaces that have not yet migrated to the
 * prayer-times-backed resolver. Friday V2 consumers should use
 * resolveUpcomingFridaySchedule().
 */
export function getUpcomingFridaySchedule(
  jumuahTimes: JumuahTime[],
  now: Date,
): FridaySchedule | undefined {
  const today = todayIso(now);
  const published = jumuahTimes
    .filter((item) => item.published && item.date >= today && isFridayIso(item.date))
    .sort((a, b) => `${a.date}T${a.prayerTime}`.localeCompare(`${b.date}T${b.prayerTime}`));

  const candidateDates = [...new Set(published.map((item) => item.date))];

  for (const date of candidateDates) {
    const items = published
      .filter((item) => item.date === date)
      .sort((a, b) => a.prayerTime.localeCompare(b.prayerTime))
      .map(additionalService);

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

export function getFridayLivePrayer(
  schedule: FridaySchedule | undefined,
  now: Date,
): FridayLivePrayer | undefined {
  if (!schedule?.items.length) return undefined;

  const index = Math.min(Math.max(schedule.nextIndex, 0), schedule.items.length - 1);
  const item = schedule.items[index];
  const target = zonedDateTime(schedule.date, item.prayerTime);
  const remainingMs = Math.max(0, target.getTime() - now.getTime());

  return {
    item,
    index,
    target,
    remainingMs,
    imminent: remainingMs <= FRIDAY_IMMINENT_WINDOW_MS,
  };
}
