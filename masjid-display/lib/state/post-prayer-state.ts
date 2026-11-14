import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "../feed-types";
import { isFridayIso, zonedDateTime } from "../time";
import { JUMUAH_HOLD_MS } from "./friday-state";

const MINUTE_MS = 60_000;
export const POST_PRAYER_DISPLAY_MS = 4 * MINUTE_MS;
const DAILY_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

export interface PostPrayerWindow {
  prayer: DisplayPrayerName;
  startMs: number;
  endMs: number;
}

const compiledWindows = new WeakMap<MasjidDisplayFeedV1, PostPrayerWindow[]>();

function windowsForFeed(feed: MasjidDisplayFeedV1): PostPrayerWindow[] {
  const cached = compiledWindows.get(feed);
  if (cached) return cached;

  const windows: PostPrayerWindow[] = [];
  const insert = (prayer: DisplayPrayerName, completedAtMs: number) => {
    if (!Number.isFinite(completedAtMs)) return;
    windows.push({
      prayer,
      startMs: completedAtMs,
      endMs: completedAtMs + POST_PRAYER_DISPLAY_MS,
    });
  };

  for (const day of feed.prayers.schedule) {
    for (const prayer of DAILY_PRAYERS) {
      if (prayer === "dhuhr" && isFridayIso(day.date)) continue;
      const delay = feed.prayers.iqamaDelays[prayer];
      const duration = feed.displaySettings.prayerDurations[prayer];
      if (!Number.isFinite(delay) || delay < 0 || !Number.isFinite(duration) || duration < 0) {
        continue;
      }
      insert(
        prayer,
        zonedDateTime(day.date, day[prayer], feed.timezone).getTime() +
          (delay + duration) * MINUTE_MS,
      );
    }

    if (!isFridayIso(day.date)) continue;
    insert(
      "dhuhr",
      zonedDateTime(day.date, day.dhuhr, feed.timezone).getTime() + JUMUAH_HOLD_MS,
    );

    const seen = new Set<string>();
    for (const service of feed.prayers.additionalJumuah) {
      if (service.date !== day.date || service.prayerTime <= day.dhuhr || seen.has(service.prayerTime)) {
        continue;
      }
      seen.add(service.prayerTime);
      insert(
        "dhuhr",
        zonedDateTime(day.date, service.prayerTime, feed.timezone).getTime() + JUMUAH_HOLD_MS,
      );
    }
  }

  windows.sort((a, b) => a.startMs - b.startMs);
  compiledWindows.set(feed, windows);
  return windows;
}

export function resolvePostPrayerWindow(
  feed: MasjidDisplayFeedV1,
  now: Date,
): PostPrayerWindow | null {
  const time = now.getTime();
  // Prefer the latest completed service if windows overlap.
  for (const window of windowsForFeed(feed).toReversed()) {
    if (time >= window.startMs && time < window.endMs) return window;
  }
  return null;
}
