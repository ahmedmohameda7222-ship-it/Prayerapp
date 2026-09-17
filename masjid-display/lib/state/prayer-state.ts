import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "../feed-types";
import { isFridayIso, zonedDateTime } from "../time";

const MINUTE_MS = 60_000;
const APPROACH_WINDOW_MS = 10 * MINUTE_MS;
const PRAYER_TIME_NOW_MAX_MS = 2 * MINUTE_MS;
const IQAMA_NOW_MS = 2 * MINUTE_MS;
const PRAYER_NAMES: DisplayPrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

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

const normal = (degradedReason: PrayerStateResolution["degradedReason"] = null): PrayerStateResolution => ({
  kind: "NORMAL",
  prayer: null,
  degradedReason,
});

function validDelay(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function resolvePrayerState(
  feed: MasjidDisplayFeedV1,
  logicalNow: Date,
): PrayerStateResolution {
  for (const prayer of PRAYER_NAMES) {
    if (!validDelay(feed.prayers.iqamaDelays[prayer])) {
      return normal("MISSING_IQAMA_DELAY");
    }
  }

  const nowMs = logicalNow.getTime();
  const candidates = feed.prayers.schedule
    .flatMap((day) =>
      PRAYER_NAMES.flatMap((prayer) => {
        if (prayer === "dhuhr" && isFridayIso(day.date)) return [];
        const delay = feed.prayers.iqamaDelays[prayer];
        const duration = feed.displaySettings.prayerDurations[prayer];
        if (!validDuration(duration)) return [];

        const prayerInstant = zonedDateTime(day.date, day[prayer], feed.timezone).getTime();
        const iqamaInstant = prayerInstant + delay * MINUTE_MS;
        const iqamaNowEnd = iqamaInstant + IQAMA_NOW_MS;
        const prayerInProgressEnd = iqamaInstant + duration * MINUTE_MS;
        const lifecycleEnd = Math.max(iqamaNowEnd, prayerInProgressEnd);

        return [{ prayer, prayerInstant, iqamaInstant, iqamaNowEnd, prayerInProgressEnd, lifecycleEnd }];
      }),
    )
    .sort((a, b) => b.prayerInstant - a.prayerInstant);

  for (const candidate of candidates) {
    const approachStart = candidate.prayerInstant - APPROACH_WINDOW_MS;
    if (nowMs < approachStart || nowMs >= candidate.lifecycleEnd) continue;

    if (nowMs < candidate.prayerInstant) {
      return { kind: "PRAYER_APPROACHING", prayer: candidate.prayer, degradedReason: null };
    }

    if (candidate.iqamaInstant === candidate.prayerInstant) {
      if (nowMs < candidate.iqamaNowEnd) {
        return { kind: "IQAMA_NOW", prayer: candidate.prayer, degradedReason: null };
      }
      if (nowMs < candidate.prayerInProgressEnd) {
        return { kind: "PRAYER_IN_PROGRESS", prayer: candidate.prayer, degradedReason: null };
      }
      continue;
    }

    const prayerTimeNowEnd = Math.min(
      candidate.prayerInstant + PRAYER_TIME_NOW_MAX_MS,
      candidate.iqamaInstant,
    );

    if (nowMs < prayerTimeNowEnd) {
      return { kind: "PRAYER_TIME_NOW", prayer: candidate.prayer, degradedReason: null };
    }
    if (nowMs < candidate.iqamaInstant) {
      return { kind: "WAITING_FOR_IQAMA", prayer: candidate.prayer, degradedReason: null };
    }
    if (nowMs < candidate.iqamaNowEnd) {
      return { kind: "IQAMA_NOW", prayer: candidate.prayer, degradedReason: null };
    }
    if (nowMs < candidate.prayerInProgressEnd) {
      return { kind: "PRAYER_IN_PROGRESS", prayer: candidate.prayer, degradedReason: null };
    }
  }

  return normal();
}
