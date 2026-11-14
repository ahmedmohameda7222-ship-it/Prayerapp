import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/feed-v1.json";
import { activeDisplayContent } from "./content-eligibility";
import type { DisplayAzkarDto, MasjidDisplayFeedV1 } from "./feed-types";

const azkar = (id: string, category: DisplayAzkarDto["category"]): DisplayAzkarDto => ({
  id,
  category,
  arabicText: "ذكر",
  translationDe: "Dhikr",
  source: "Source",
  repeatCount: 1,
  sortOrder: 1,
});

function configuredFeed(): MasjidDisplayFeedV1 {
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  feed.azkar = [
    azkar("morning", "Morning"),
    azkar("evening", "Evening"),
    azkar("after-prayer", "After Prayer"),
    azkar("friday", "Friday"),
    azkar("travel", "Travel"),
  ];
  feed.displaySettings.azkarPlaylistIds = feed.azkar.map((item) => item.id);
  return feed;
}

const weekday = (time: string) => new Date(`2026-09-15T${time}+02:00`);
const friday = (time: string) => new Date(`2026-09-18T${time}+02:00`);

describe("context-aware TV Azkar selection", () => {
  it("presents After Prayer selected Azkar after the actual configured congregational prayer window", () => {
    const feed = configuredFeed();
    // Asr 16:45, Iqama +15, in-progress duration +10 => finishes 17:10.
    expect(activeDisplayContent(feed, weekday("17:09:59")).azkar.map((a) => a.id)).not.toEqual(["after-prayer"]);
    expect(activeDisplayContent(feed, weekday("17:10:00")).azkar.map((a) => a.id)).toEqual(["after-prayer"]);
    expect(activeDisplayContent(feed, weekday("17:13:59")).azkar.map((a) => a.id)).toEqual(["after-prayer"]);
    expect(activeDisplayContent(feed, weekday("17:14:00")).azkar.map((a) => a.id)).toEqual(["evening"]);
  });

  it("shows Friday Azkar on Friday, but gives priority to After Prayer after Jumuah", () => {
    const feed = configuredFeed();
    feed.prayers.additionalJumuah = [
      { id: "second", date: "2026-09-18", prayerTime: "15:00" },
    ];
    expect(activeDisplayContent(feed, friday("11:00:00")).azkar.map((a) => a.id)).toEqual(["morning", "friday"]);
    // Jumuah #1 13:10 + 30-minute display hold => normal resumes at 13:40.
    expect(activeDisplayContent(feed, friday("13:40:00")).azkar.map((a) => a.id)).toEqual(["after-prayer"]);
    expect(activeDisplayContent(feed, friday("13:55:00")).azkar.map((a) => a.id)).toEqual(["friday"]);
    // Second Jumuah holds to 15:30.
    expect(activeDisplayContent(feed, friday("15:30:00")).azkar.map((a) => a.id)).toEqual(["after-prayer"]);
    expect(activeDisplayContent(feed, friday("15:45:00")).azkar.map((a) => a.id)).toEqual(["evening", "friday"]);
  });

  it("never displays Travel/After Prayer/Friday Azkar at an unrelated weekday time merely as fallback", () => {
    const feed = configuredFeed();
    feed.displaySettings.azkarPlaylistIds = ["after-prayer", "friday", "travel"];
    expect(activeDisplayContent(feed, weekday("09:00:00")).azkar).toEqual([]);
    expect(activeDisplayContent(feed, weekday("17:10:00")).azkar.map((a) => a.id)).toEqual(["after-prayer"]);
  });

  it("does not replace missing morning Azkar with evening Azkar", () => {
    const feed = configuredFeed();
    feed.displaySettings.azkarPlaylistIds = ["evening", "after-prayer"];
    expect(activeDisplayContent(feed, weekday("09:00:00")).azkar).toEqual([]);
    expect(activeDisplayContent(feed, weekday("17:11:00")).azkar.map((a) => a.id)).toEqual(["after-prayer"]);
  });
});
