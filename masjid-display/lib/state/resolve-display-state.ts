import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "../feed-types";

export type DisplayStateKind =
  | "NORMAL"
  | "PRAYER_APPROACHING"
  | "PRAYER_TIME_NOW"
  | "WAITING_FOR_IQAMA"
  | "IQAMA_NOW"
  | "PRAYER_IN_PROGRESS"
  | "FRIDAY_MODE"
  | "JUMUAH_NOW";

export interface DisplayStateResolution {
  kind: DisplayStateKind;
  prayer: DisplayPrayerName | null;
  degraded: boolean;
  degradedReason: "SCHEDULE_COVERAGE_MISSING" | "MISSING_IQAMA_DELAY" | null;
  serviceId?: string;
  serviceIndex?: number;
}

export function resolveDisplayState(
  _feed: MasjidDisplayFeedV1,
  _logicalNow: Date,
): DisplayStateResolution {
  return { kind: "NORMAL", prayer: null, degraded: false, degradedReason: null };
}
