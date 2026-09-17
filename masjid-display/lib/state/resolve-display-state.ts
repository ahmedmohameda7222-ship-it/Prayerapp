import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "../feed-types";
import { localDateIso } from "../time";
import { resolveFridayState } from "./friday-state";
import { resolvePrayerState } from "./prayer-state";

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
  feed: MasjidDisplayFeedV1,
  logicalNow: Date,
): DisplayStateResolution {
  const currentDate = localDateIso(logicalNow, feed.timezone);
  if (!feed.prayers.schedule.some((day) => day.date === currentDate)) {
    return {
      kind: "NORMAL",
      prayer: null,
      degraded: true,
      degradedReason: "SCHEDULE_COVERAGE_MISSING",
    };
  }

  const friday = resolveFridayState(feed, logicalNow);
  if (friday) {
    return {
      ...friday,
      prayer: null,
      degraded: false,
      degradedReason: null,
    };
  }

  const prayer = resolvePrayerState(feed, logicalNow);
  return {
    kind: prayer.kind,
    prayer: prayer.prayer,
    degraded: prayer.degradedReason !== null,
    degradedReason: prayer.degradedReason,
  };
}
