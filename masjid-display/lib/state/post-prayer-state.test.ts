import { describe, expect, it } from "vitest";
import fixture from "../__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../feed-types";
import { resolveDisplayState } from "./resolve-display-state";
import { resolvePostPrayerWindow } from "./post-prayer-state";

function configured(): MasjidDisplayFeedV1 {
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  feed.azkar = [
    {
      id: "first",
      category: "After Prayer",
      arabicText: "أستغفر الله",
      translationDe: "Ich bitte Allah um Vergebung",
      source: "Hisn al-Muslim 66",
      repeatCount: 3,
      sortOrder: 1,
    },
  ];
  feed.displaySettings.azkarPlaylistIds = ["first"];
  return feed;
}
const at = (date: string, time: string) => new Date(`${date}T${time}+02:00`);

describe("fixed four-minute after-prayer TV state", () => {
  it("starts after congregational completion and stops at 240 seconds, never after the old 15-minute window", () => {
    const feed = configured();
    expect(resolveDisplayState(feed, at("2026-09-15", "17:09:59")).kind).toBe("PRAYER_IN_PROGRESS");
    expect(resolvePostPrayerWindow(feed, at("2026-09-15", "17:09:59"))).toBeNull();
    expect(resolveDisplayState(feed, at("2026-09-15", "17:10:00"))).toMatchObject({
      kind: "POST_PRAYER_AZKAR",
      prayer: "asr",
    });
    expect(resolveDisplayState(feed, at("2026-09-15", "17:13:59")).kind).toBe("POST_PRAYER_AZKAR");
    expect(resolveDisplayState(feed, at("2026-09-15", "17:14:00")).kind).toBe("NORMAL");
  });

  it("offers 240 seconds after primary and additional Friday services without inventing Iqama", () => {
    const feed = configured();
    expect(resolveDisplayState(feed, at("2026-09-18", "13:39:59")).kind).toBe("JUMUAH_NOW");
    expect(resolveDisplayState(feed, at("2026-09-18", "13:40:00"))).toMatchObject({
      kind: "POST_PRAYER_AZKAR", prayer: "dhuhr",
    });
    expect(resolveDisplayState(feed, at("2026-09-18", "13:44:00")).kind).toBe("NORMAL");
    expect(resolveDisplayState(feed, at("2026-09-18", "15:30:00")).kind).toBe("POST_PRAYER_AZKAR");
    expect(resolveDisplayState(feed, at("2026-09-18", "15:34:00")).kind).toBe("NORMAL");
  });

  it("does not enter a post-prayer screen when no After Prayer Azkar were selected", () => {
    const feed = configured();
    feed.displaySettings.azkarPlaylistIds = [];
    expect(resolveDisplayState(feed, at("2026-09-15", "17:10:01")).kind).toBe("NORMAL");
  });

  it("keeps the regular prayer and Friday precedence while the board would otherwise be eligible", () => {
    const feed = configured();
    feed.prayers.schedule.find((d) => d.date === "2026-09-15")!.maghrib = "17:12";
    expect(resolveDisplayState(feed, at("2026-09-15", "17:11:00")).kind).toBe("PRAYER_APPROACHING");
  });
});
