import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "./feed-types";
import { getPostPrayerPlaylist, postPrayerSlideAt } from "./post-prayer-playlist";

function feedWithItems(): MasjidDisplayFeedV1 {
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  feed.azkar = [
    { id: "later", category: "After Prayer", arabicText: "الحمد لله", translationDe: "Alles Lob gebührt Allah", source: "Hisn al-Muslim", repeatCount: 33, sortOrder: 2 },
    { id: "first", category: "After Prayer", arabicText: "أستغفر الله", translationDe: "Ich bitte Allah um Vergebung", source: "Hisn al-Muslim", repeatCount: 3, sortOrder: 1 },
    { id: "not-selected", category: "After Prayer", arabicText: "مخفي", translationDe: "Verborgen", source: "Hisn al-Muslim", repeatCount: 1, sortOrder: 3 },
  ];
  feed.displaySettings.azkarPlaylistIds = ["later", "first"];
  return feed;
}

describe("deterministic after-prayer reading-time rotation", () => {
  it("orders selected dhikr and allocates actual reading time including 3x and 33x repetitions", () => {
    const playlist = getPostPrayerPlaylist(feedWithItems(), "asr");
    expect(playlist.slides).toHaveLength(2);
    expect(playlist.slides.map((slide) => slide.itemId)).toEqual(["first", "later"]);
    // First: 4s base + 2 Arabic words * 0.7s * 3 + 5 German words * 0.45s => 11s.
    // Second: 4s base + 2 Arabic words * 0.7s * 33 + 4 German words * 0.45s => 52s.
    expect(playlist.slides.map((slide) => slide.durationMs)).toEqual([11_000, 52_000]);
    expect(playlist.totalMs).toBe(63_000);
    expect(postPrayerSlideAt(playlist, 0)?.index).toBe(0);
    expect(postPrayerSlideAt(playlist, 10_999)?.index).toBe(0);
    expect(postPrayerSlideAt(playlist, 11_000)?.index).toBe(1);
    expect(postPrayerSlideAt(playlist, 62_999)?.index).toBe(1);
    expect(postPrayerSlideAt(playlist, 63_000)).toBeNull();
  });

  it("keeps a complete long Quranic verse with its German translation on ONE slide", () => {
    const feed = feedWithItems();
    const arabic = Array.from({ length: 86 }, (_, i) => `آية${i}`).join(" ");
    const german = Array.from({ length: 130 }, (_, i) => `Wort${i}`).join(" ");
    feed.azkar = [{
      id: "after-prayer-ayat-al-kursi", category: "After Prayer",
      arabicText: arabic, translationDe: german,
      source: "Quran 2:255", repeatCount: 1, sortOrder: 1,
    }];
    feed.displaySettings.azkarPlaylistIds = [feed.azkar[0].id];

    const playlist = getPostPrayerPlaylist(feed, "asr");
    expect(playlist.slides).toHaveLength(1);
    expect(playlist.slides[0]).toMatchObject({
      itemId: "after-prayer-ayat-al-kursi",
      language: "both",
      arabicText: arabic,
      translationDe: german,
    });
    expect(playlist.totalMs).toBe(playlist.slides[0].durationMs);
    expect(postPrayerSlideAt(playlist, playlist.totalMs - 1)?.slide.arabicText).toBe(arabic);
    expect(postPrayerSlideAt(playlist, playlist.totalMs)).toBeNull();
  });

  it("keeps medium-length Arabic and German together without splitting either text", () => {
    const feed = feedWithItems();
    feed.azkar = [{
      id: "medium", category: "After Prayer",
      arabicText: Array.from({ length: 15 }, () => "اللهم").join(" "),
      translationDe: Array.from({ length: 22 }, () => "Allah").join(" "),
      source: "Hisn al-Muslim", repeatCount: 1, sortOrder: 1,
    }];
    feed.displaySettings.azkarPlaylistIds = ["medium"];
    const playlist = getPostPrayerPlaylist(feed, "asr");
    expect(playlist.slides).toHaveLength(1);
    expect(playlist.slides[0]).toMatchObject({
      language: "both", arabicText: feed.azkar[0].arabicText,
      translationDe: feed.azkar[0].translationDe,
    });
  });

  it("keeps Fajr-only items out of Asr and does not invent an empty playlist", () => {
    const feed = feedWithItems();
    feed.azkar = [{ id: "after-prayer-fajr-ilm-rizq-amal", category: "After Prayer", arabicText: "اللهم", translationDe: "O Allah", source: "Hisn al-Muslim", repeatCount: 1, sortOrder: 1 }];
    feed.displaySettings.azkarPlaylistIds = [feed.azkar[0].id];
    expect(getPostPrayerPlaylist(feed, "asr").totalMs).toBe(0);
    expect(getPostPrayerPlaylist(feed, "fajr").slides).toHaveLength(1);
  });

  it("longer words and a larger repeat count increase total duration without changing source text", () => {
    const short = feedWithItems();
    const baseline = getPostPrayerPlaylist(short, "asr").totalMs;
    const longer = feedWithItems();
    longer.azkar[1].arabicText += " واغفر لنا يا رب العالمين";
    expect(getPostPrayerPlaylist(longer, "asr").totalMs).toBeGreaterThan(baseline);
  });
});
