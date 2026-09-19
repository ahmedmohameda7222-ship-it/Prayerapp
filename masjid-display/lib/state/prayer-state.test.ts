import fixture from "../__fixtures__/feed-v1.json";
import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "../feed-types";
import { describe, expect, it } from "vitest";
import { resolvePrayerState } from "./prayer-state";

function feedWithPrayer({
  date = "2026-09-15",
  prayerName = "asr",
  prayer = "18:00",
  delay = 10,
  duration = 10,
}: {
  date?: string;
  prayerName?: DisplayPrayerName;
  prayer?: string;
  delay?: number;
  duration?: number;
} = {}): MasjidDisplayFeedV1 {
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  const day = feed.prayers.schedule.find((row) => row.date === date);
  if (!day) throw new Error(`fixture missing ${date}`);
  day[prayerName] = prayer;
  feed.prayers.iqamaDelays[prayerName] = delay;
  feed.displaySettings.prayerDurations[prayerName] = duration;
  feed.prayers.additionalJumuah = [];
  return feed;
}

const local = (time: string, date = "2026-09-15") => new Date(`${date}T${time}+02:00`);

describe("normal prayer lifecycle", () => {
  it.each([
    ["17:49:59", "NORMAL"],
    ["17:50:00", "PRAYER_APPROACHING"],
    ["18:00:00", "PRAYER_TIME_NOW"],
    ["18:02:00", "WAITING_FOR_IQAMA"],
    ["18:10:00", "IQAMA_NOW"],
    ["18:12:00", "PRAYER_IN_PROGRESS"],
    ["18:20:00", "NORMAL"],
  ] as const)("resolves %s as %s", (localTime, expected) => {
    expect(resolvePrayerState(feedWithPrayer(), local(localTime)).kind).toBe(expected);
  });

  it("enters Iqama Now immediately when delay is zero", () => {
    const feed = feedWithPrayer({ delay: 0 });
    expect(resolvePrayerState(feed, local("18:00:00")).kind).toBe("IQAMA_NOW");
    expect(resolvePrayerState(feed, local("18:02:00")).kind).toBe("PRAYER_IN_PROGRESS");
  });

  it("shortens Prayer Time Now to one minute when delay is one", () => {
    const feed = feedWithPrayer({ delay: 1 });
    expect(resolvePrayerState(feed, local("18:00:59")).kind).toBe("PRAYER_TIME_NOW");
    expect(resolvePrayerState(feed, local("18:01:00")).kind).toBe("IQAMA_NOW");
  });

  it("lets delay two transition directly from Prayer Time Now to Iqama Now", () => {
    const feed = feedWithPrayer({ delay: 2 });
    expect(resolvePrayerState(feed, local("18:01:59")).kind).toBe("PRAYER_TIME_NOW");
    expect(resolvePrayerState(feed, local("18:02:00")).kind).toBe("IQAMA_NOW");
  });

  it("never creates a religious state for sunrise", () => {
    const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
    expect(resolvePrayerState(feed, local("06:30:00")).kind).toBe("NORMAL");
  });

  it("fails safe when an Iqama delay is missing", () => {
    const feed = feedWithPrayer();
    delete (feed.prayers.iqamaDelays as Partial<Record<DisplayPrayerName, number>>).asr;
    const resolved = resolvePrayerState(feed, local("18:05:00"));
    expect(resolved.kind).toBe("NORMAL");
    expect(resolved.prayer).toBeNull();
    expect(resolved.degradedReason).toBe("MISSING_IQAMA_DELAY");
  });

  it("continues a previous-day Isha lifecycle across midnight", () => {
    const feed = feedWithPrayer({
      date: "2026-09-14",
      prayerName: "isha",
      prayer: "23:55",
      delay: 10,
      duration: 10,
    });
    expect(resolvePrayerState(feed, local("00:07:00", "2026-09-15"))).toMatchObject({
      kind: "PRAYER_IN_PROGRESS",
      prayer: "isha",
    });
  });

  it("resolves a wake jump directly to the current in-progress state", () => {
    const feed = feedWithPrayer();
    expect(resolvePrayerState(feed, local("17:55:00")).kind).toBe("PRAYER_APPROACHING");
    expect(resolvePrayerState(feed, local("18:13:00"))).toMatchObject({
      kind: "PRAYER_IN_PROGRESS",
      prayer: "asr",
    });
  });
});
