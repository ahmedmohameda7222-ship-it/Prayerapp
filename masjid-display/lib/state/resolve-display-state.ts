import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "../feed-types";
import { localDateIso } from "../time";
import { resolveFridayState } from "./friday-state";
import { resolvePrayerState } from "./prayer-state";
import { resolvePostPrayerWindow } from "./post-prayer-state";

export type DisplayStateKind =
  | "NORMAL"
  | "PRAYER_APPROACHING"
  | "PRAYER_TIME_NOW"
  | "WAITING_FOR_IQAMA"
  | "IQAMA_NOW"
  | "PRAYER_IN_PROGRESS"
  | "POST_PRAYER_AZKAR"
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
  if (prayer.kind !== "NORMAL" || prayer.degradedReason) {
    return {
      kind: prayer.kind,
      prayer: prayer.prayer,
      degraded: prayer.degradedReason !== null,
      degradedReason: prayer.degradedReason,
    };
  }

  const hasSelectedPostPrayer = feed.azkar.some(
    (item) => item.category === "After Prayer" &&
      feed.displaySettings.azkarPlaylistIds.includes(item.id),
  );
  const afterPrayer = hasSelectedPostPrayer ? resolvePostPrayerWindow(feed, logicalNow) : null;
  if (afterPrayer) {
    return {
      kind: "POST_PRAYER_AZKAR",
      prayer: afterPrayer.prayer,
      degraded: false,
      degradedReason: null,
    };
  }

  return {
    kind: "NORMAL",
    prayer: null,
    degraded: false,
    degradedReason: null,
  };
}
