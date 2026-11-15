import { describe, expect, it } from "vitest";
import fixture from "../__fixtures__/feed-v1.json";
import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "../feed-types";
import { resolvePrayerState } from "./prayer-state";
import { resolveDisplayState } from "./resolve-display-state";
import { resolvePostPrayerWindow } from "./post-prayer-state";

const local = (clock: string, day = "2026-09-15") => new Date(`${day}T${clock}+02:00`);
const minutes: Record<DisplayPrayerName, number> = {
  fajr: 6, dhuhr: 10, asr: 10, maghrib: 7, isha: 10,
};

function setup(prayer: DisplayPrayerName): MasjidDisplayFeedV1 {
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  const day = feed.prayers.schedule.find((entry) => entry.date === "2026-09-15")!;
  day[prayer] = "18:00";
  feed.prayers.iqamaDelays[prayer] = 10;
  // A different Admin setting must NOT alter the explicitly approved
  // physical-TV blackout time.
  feed.displaySettings.prayerDurations[prayer] = 2;
  feed.azkar = [{
    id: "after-prayer-first", category: "After Prayer", arabicText: "أستغفر الله",
    translationDe: "Ich bitte Allah um Vergebung", source: "Hisn al-Muslim 66",
    repeatCount: 3, sortOrder: 1,
  }];
  feed.displaySettings.azkarPlaylistIds = ["after-prayer-first"];
  return feed;
}

describe("30-second Iqama followed by fully black congregational prayer", () => {
  it.each(Object.entries(minutes) as [DisplayPrayerName,number][])(
    "%s shows 30s Iqama, %i minutes blackout, then the complete selected reading playlist",
    (prayer, blackoutMinutes) => {
      const feed = setup(prayer);
      const midnight = local("18:10:00").getTime();
      const at = (ms: number) => new Date(midnight + ms);
      const blackoutStart = 30_000;
      const blackoutEnd = blackoutStart + blackoutMinutes * 60_000;

      expect(resolvePrayerState(feed, at(0))).toMatchObject({ kind: "IQAMA_NOW", prayer });
      expect(resolvePrayerState(feed, at(29_999)).kind).toBe("IQAMA_NOW");
      expect(resolvePrayerState(feed, at(blackoutStart))).toMatchObject({
        kind: "PRAYER_IN_PROGRESS", prayer,
      });
      expect(resolvePrayerState(feed, at(blackoutEnd - 1)).kind).toBe("PRAYER_IN_PROGRESS");
      expect(resolvePrayerState(feed, at(blackoutEnd)).kind).toBe("NORMAL");
      expect(resolvePostPrayerWindow(feed, at(blackoutEnd - 1))).toBeNull();
      expect(resolvePostPrayerWindow(feed, at(blackoutEnd))).toMatchObject({
        prayer, startMs: midnight + blackoutEnd,
        endMs: midnight + blackoutEnd + 11_000,
      });
      expect(resolveDisplayState(feed, at(blackoutEnd))).toMatchObject({
        kind: "POST_PRAYER_AZKAR", prayer,
      });
      expect(resolveDisplayState(feed, at(blackoutEnd + 10_999)).kind).toBe("POST_PRAYER_AZKAR");
      expect(resolvePostPrayerWindow(feed, at(blackoutEnd + 11_000))).toBeNull();
    },
  );

  it("enters 30-second Iqama immediately for zero delay and black after it", () => {
    const feed = setup("asr");
    feed.prayers.iqamaDelays.asr = 0;
    expect(resolvePrayerState(feed, local("18:00:29")).kind).toBe("IQAMA_NOW");
    expect(resolvePrayerState(feed, local("18:00:30")).kind).toBe("PRAYER_IN_PROGRESS");
  });

  it("continues the 10-minute Isha blackout past midnight with logical Berlin time", () => {
    const feed = setup("isha");
    feed.prayers.schedule.find((entry) => entry.date === "2026-09-15")!.isha = "23:55";
    expect(resolveDisplayState(feed, local("00:05:30", "2026-09-16")).kind)
      .toBe("PRAYER_IN_PROGRESS");
    expect(resolveDisplayState(feed, local("00:15:30", "2026-09-16")).kind)
      .toBe("POST_PRAYER_AZKAR");
  });

  it("keeps existing Friday service state and never blacks out a Jumuah", () => {
    const feed = setup("dhuhr");
    const day = feed.prayers.schedule.find((entry) => entry.date === "2026-09-18")!;
    day.dhuhr = "13:10";
    expect(resolveDisplayState(feed, local("13:10:30","2026-09-18")).kind).toBe("JUMUAH_NOW");
  });
});
