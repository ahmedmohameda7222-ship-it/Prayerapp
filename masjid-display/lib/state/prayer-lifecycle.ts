import type { DisplayPrayerName } from "../feed-types";

/** Physical-TV notice duration after the real Iqama instant. */
export const IQAMA_ANNOUNCEMENT_MS = 30_000;

/** Fixed congregation blackout durations approved for the actual TV. */
export const PRAYER_BLACKOUT_MS: Record<DisplayPrayerName, number> = {
  fajr: 6 * 60_000,
  dhuhr: 10 * 60_000,
  asr: 10 * 60_000,
  maghrib: 7 * 60_000,
  isha: 10 * 60_000,
};

/** Ends the entirely black interval, not the old Admin-configured prayer duration. */
export function prayerBlackoutEndMs(prayer: DisplayPrayerName, iqamaInstantMs: number): number {
  return iqamaInstantMs + IQAMA_ANNOUNCEMENT_MS + PRAYER_BLACKOUT_MS[prayer];
}
