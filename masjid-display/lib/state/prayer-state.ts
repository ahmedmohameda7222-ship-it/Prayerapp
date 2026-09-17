import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "../feed-types";

export type PrayerStateKind =
  | "NORMAL"
  | "PRAYER_APPROACHING"
  | "PRAYER_TIME_NOW"
  | "WAITING_FOR_IQAMA"
  | "IQAMA_NOW"
  | "PRAYER_IN_PROGRESS";

export interface PrayerStateResolution {
  kind: PrayerStateKind;
  prayer: DisplayPrayerName | null;
  degradedReason: "MISSING_IQAMA_DELAY" | null;
}

export function resolvePrayerState(
  _feed: MasjidDisplayFeedV1,
  _logicalNow: Date,
): PrayerStateResolution {
  return { kind: "NORMAL", prayer: null, degradedReason: null };
}
