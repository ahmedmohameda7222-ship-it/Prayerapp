import fixture from "../__fixtures__/feed-v1.json";
import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "../feed-types";
import { describe, expect, it } from "vitest";
import { resolveDisplayState } from "./resolve-display-state";
import { resolvePrayerState } from "./prayer-state";

const prayers: DisplayPrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const local = (time: string, date = "2026-09-15") =>
  new Date(`${date}T${time}+02:00`);

function prayerFeed(
  prayerName: DisplayPrayerName = "asr",
  options: { date?: string; prayer?: string; delay?: number; duration?: number } = {},
): MasjidDisplayFeedV1 {
  const date = options.date ?? "2026-09-15";
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  const day = feed.prayers.schedule.find((row) => row.date === date);
  if (!day) throw new Error(`fixture missing ${date}`);
  day[prayerName] = options.prayer ?? "18:00";
  feed.prayers.iqamaDelays[prayerName] = options.delay ?? 10;
  feed.displaySettings.prayerDurations[prayerName] = options.duration ?? 10;
  feed.prayers.additionalJumuah = [];
  return feed;
}

function fridayFeed(): MasjidDisplayFeedV1 {
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  const day = feed.prayers.schedule.find((row) => row.date === "2026-09-18");
  if (!day) throw new Error("fixture missing Friday");
  day.dhuhr = "13:10";
  feed.prayers.additionalJumuah = [
    { id: "jumuah-2", date: "2026-09-18", prayerTime: "13:35" },
    { id: "jumuah-3", date: "2026-09-18", prayerTime: "15:00" },
  ];
  return feed;
}

describe("Masjid Display state production certification", () => {
  it.each(prayers)("certifies the complete %s lifecycle", (prayer) => {
    const feed = prayerFeed(prayer);
    expect(resolvePrayerState(feed, local("17:49:59"))).toMatchObject({ kind: "NORMAL" });
    expect(resolvePrayerState(feed, local("17:50:00"))).toMatchObject({
      kind: "PRAYER_APPROACHING",
      prayer,
    });
    expect(resolvePrayerState(feed, local("18:00:00"))).toMatchObject({
      kind: "PRAYER_TIME_NOW",
      prayer,
    });
    expect(resolvePrayerState(feed, local("18:02:00"))).toMatchObject({
      kind: "WAITING_FOR_IQAMA",
      prayer,
    });
    expect(resolvePrayerState(feed, local("18:10:00"))).toMatchObject({
      kind: "IQAMA_NOW",
      prayer,
    });
    expect(resolvePrayerState(feed, local("18:12:00"))).toMatchObject({
      kind: "PRAYER_IN_PROGRESS",
      prayer,
    });
    expect(resolvePrayerState(feed, local("18:20:00"))).toMatchObject({ kind: "NORMAL" });
  });

  it.each([
    [0, "18:00:00", "IQAMA_NOW"],
    [1, "18:00:59", "PRAYER_TIME_NOW"],
    [1, "18:01:00", "IQAMA_NOW"],
    [2, "18:01:59", "PRAYER_TIME_NOW"],
    [2, "18:02:00", "IQAMA_NOW"],
    [7, "18:02:00", "WAITING_FOR_IQAMA"],
    [7, "18:07:00", "IQAMA_NOW"],
  ] as const)("certifies delay %i at %s as %s", (delay, time, kind) => {
    expect(resolvePrayerState(prayerFeed("asr", { delay }), local(time)).kind).toBe(kind);
  });

  it("ends Prayer In Progress from the original Iqama instant", () => {
    const feed = prayerFeed("asr", { delay: 10, duration: 3 });
    expect(resolvePrayerState(feed, local("18:11:59")).kind).toBe("IQAMA_NOW");
    expect(resolvePrayerState(feed, local("18:12:00")).kind).toBe("PRAYER_IN_PROGRESS");
    expect(resolvePrayerState(feed, local("18:12:59")).kind).toBe("PRAYER_IN_PROGRESS");
    expect(resolvePrayerState(feed, local("18:13:00")).kind).toBe("NORMAL");
  });

  it("never creates a prayer lifecycle for Sunrise", () => {
    const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
    expect(resolveDisplayState(feed, local("06:20:00")).kind).toBe("NORMAL");
    expect(resolveDisplayState(feed, local("06:30:00")).kind).toBe("NORMAL");
    expect(resolveDisplayState(feed, local("06:32:00")).kind).toBe("NORMAL");
  });

  it("preserves a previous-day Isha lifecycle across midnight", () => {
    const feed = prayerFeed("isha", {
      date: "2026-09-14",
      prayer: "23:55",
      delay: 10,
      duration: 10,
    });
    expect(resolveDisplayState(feed, local("00:07:00", "2026-09-15"))).toMatchObject({
      kind: "PRAYER_IN_PROGRESS",
      prayer: "isha",
    });
  });

  it("resolves a wake jump from an expired transient state directly to current state", () => {
    const feed = prayerFeed("asr");
    expect(resolveDisplayState(feed, local("17:55:00")).kind).toBe("PRAYER_APPROACHING");
    expect(resolveDisplayState(feed, local("18:13:00"))).toMatchObject({
      kind: "PRAYER_IN_PROGRESS",
      prayer: "asr",
    });
  });

  it("certifies Friday primary, holds, preemption, multiple services, and return to Normal", () => {
    const feed = fridayFeed();
    const friday = (time: string) => local(time, "2026-09-18");

    expect(resolveDisplayState(feed, friday("12:09:59")).kind).toBe("NORMAL");
    expect(resolveDisplayState(feed, friday("12:10:00"))).toMatchObject({
      kind: "FRIDAY_MODE",
      serviceIndex: 0,
      serviceId: "primary:2026-09-18",
    });
    expect(resolveDisplayState(feed, friday("13:10:00"))).toMatchObject({
      kind: "JUMUAH_NOW",
      serviceIndex: 0,
    });
    expect(resolveDisplayState(feed, friday("13:24:59")).kind).toBe("JUMUAH_NOW");
    expect(resolveDisplayState(feed, friday("13:25:00"))).toMatchObject({
      kind: "FRIDAY_MODE",
      serviceIndex: 1,
      serviceId: "jumuah-2",
    });
    expect(resolveDisplayState(feed, friday("13:35:00"))).toMatchObject({
      kind: "JUMUAH_NOW",
      serviceIndex: 1,
    });
    expect(resolveDisplayState(feed, friday("14:49:59")).kind).toBe("NORMAL");
    expect(resolveDisplayState(feed, friday("14:50:00"))).toMatchObject({
      kind: "FRIDAY_MODE",
      serviceIndex: 2,
      serviceId: "jumuah-3",
    });
    expect(resolveDisplayState(feed, friday("15:00:00"))).toMatchObject({
      kind: "JUMUAH_NOW",
      serviceIndex: 2,
    });
    expect(resolveDisplayState(feed, friday("15:30:00")).kind).toBe("NORMAL");
  });

  it("uses Friday Dhuhr as primary Jumuah and never runs the Dhuhr Iqama lifecycle", () => {
    const feed = fridayFeed();
    feed.prayers.iqamaDelays.dhuhr = 0;
    expect(resolveDisplayState(feed, local("13:10:00", "2026-09-18"))).toMatchObject({
      kind: "JUMUAH_NOW",
      prayer: null,
      serviceIndex: 0,
    });
  });
});
