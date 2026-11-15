import { describe, expect, it } from "vitest";
import type { DisplayAzkarDto } from "./feed-types";
import { activeAfterPrayerSlide, afterPrayerTotalMs, durationForDhikr, paginateDhikrText } from "./after-prayer-rotation";

const first: DisplayAzkarDto = {
  id: "first", category: "After Prayer", arabicText: "أستغفر الله",
  translationDe: "Ich bitte Allah um Vergebung", source: "Hisn al-Muslim",
  repeatCount: 3, sortOrder: 1,
};
const second: DisplayAzkarDto = {
  ...first, id: "second", arabicText: "سبحان الله",
  translationDe: "Gepriesen sei Allah", repeatCount: 33, sortOrder: 2,
};

describe("post-prayer rotating dhikr reading-time schedule", () => {
  it("holds short dhikr at least 18s, and 33 repetitions materially longer", () => {
    expect(durationForDhikr(first)).toBe(18_000);
    expect(durationForDhikr(second)).toBe(76_000);
    expect(durationForDhikr(second)).toBeGreaterThan(durationForDhikr(first));
  });

  it("gives longer bilingual text additional time without unbounded delay", () => {
    const long = { ...first, arabicText: Array(100).fill("الله").join(" "),
      translationDe: Array(180).fill("Allah").join(" "), repeatCount: 1 };
    expect(durationForDhikr(long)).toBe(163_000);
    expect(durationForDhikr({ ...long, translationDe: Array(1000).fill("Wort").join(" ") }))
      .toBe(180_000);
  });

  it("shows exactly one selected item for its window, then returns to NORMAL", () => {
    const items = [first, second];
    const startMs = Date.parse("2026-09-15T17:10:30+02:00");
    expect(afterPrayerTotalMs(items)).toBe(94_000);
    expect(activeAfterPrayerSlide(items, startMs, startMs - 1)).toBeNull();
    expect(activeAfterPrayerSlide(items, startMs, startMs)).toMatchObject({ index: 0, item: first, count: 2, language: "both" });
    expect(activeAfterPrayerSlide(items, startMs, startMs + 17_999)?.item.id).toBe("first");
    expect(activeAfterPrayerSlide(items, startMs, startMs + 18_000)).toMatchObject({ index: 1, item: second });
    expect(activeAfterPrayerSlide(items, startMs, startMs + 93_999)?.item.id).toBe("second");
    expect(activeAfterPrayerSlide(items, startMs, startMs + 94_000)).toBeNull();
  });

  it("separates very long Arabic and German text into two larger readable phases", () => {
    const long = { ...first, id: "long", arabicText: Array(100).fill("الله").join(" "),
      translationDe: Array(180).fill("Allah").join(" "), repeatCount: 1 };
    const start = Date.parse("2026-09-15T17:10:30+02:00");
    expect(activeAfterPrayerSlide([long], start, start)).toMatchObject({ language: "ar", index: 0 });
    expect(activeAfterPrayerSlide([long], start, start + 40_000)).toMatchObject({ language: "ar" });
    expect(activeAfterPrayerSlide([long], start, start + 120_000)).toMatchObject({ language: "de" });
    expect(activeAfterPrayerSlide([long], start, start + 163_000)).toBeNull();
  });

  it("paginates full long text on word boundaries without any clipping or omitted words", () => {
    const arabic = Array.from({ length: 120 }, (_, index) => `ذكر${index}`).join(" ");
    const german = Array.from({ length: 120 }, (_, index) => `Wort${index}`).join(" ");
    const arabicPages = paginateDhikrText(arabic, 170);
    const germanPages = paginateDhikrText(german, 260);
    expect(arabicPages.length).toBeGreaterThan(2);
    expect(germanPages.length).toBeGreaterThan(2);
    expect(arabicPages.every((page) => page.length <= 170)).toBe(true);
    expect(germanPages.every((page) => page.length <= 260)).toBe(true);
    expect(arabicPages.join(" ")).toBe(arabic);
    expect(germanPages.join(" ")).toBe(german);

    const long = { ...first, arabicText: arabic, translationDe: german, repeatCount: 1 };
    const start = Date.parse("2026-09-15T17:10:30+02:00");
    const atStart = activeAfterPrayerSlide([long], start, start);
    const later = activeAfterPrayerSlide([long], start, start + 30_000);
    expect(atStart).toMatchObject({ language: "ar", pageIndex: 0 });
    expect(later?.pageIndex).toBeGreaterThan(0);
    expect(atStart?.textAr).toBe(arabicPages[0]);
    expect(atStart?.textAr).not.toBe(arabic);
    expect(later?.textAr).not.toBe(atStart?.textAr);
  });

  it("never invents a slide for an empty selection", () => {
    expect(afterPrayerTotalMs([])).toBe(0);
    expect(activeAfterPrayerSlide([], 1_000, 1_000)).toBeNull();
  });
});
