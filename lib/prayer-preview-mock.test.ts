import { describe, expect, it } from "vitest";
import { getPrayerPreviewMockData, getPrayerPreviewNotice } from "@/lib/prayer-preview-mock";

describe("prayer preview mock", () => {
  it("generates a continuous dynamic schedule for the requested range", () => {
    const rows = getPrayerPreviewMockData("2026-08-14", "2026-08-17", new Date("2026-08-15T00:30:00Z"));

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.date)).toEqual([
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
      "2026-08-17",
    ]);
    expect(rows.every((row) => row.published)).toBe(true);
    expect(rows.every((row) => row.id.startsWith("preview-prayer-"))).toBe(true);
  });

  it("keeps all prayer and iqama values in HH:MM form", () => {
    const [row] = getPrayerPreviewMockData("2026-08-15", "2026-08-15", new Date("2026-08-15T00:30:00Z"));
    const values = [
      row.fajr,
      row.sunrise,
      row.dhuhr,
      row.asr,
      row.maghrib,
      row.isha,
      row.fajrIqama,
      row.dhuhrIqama,
      row.asrIqama,
      row.maghribIqama,
      row.ishaIqama,
    ];

    for (const value of values) {
      expect(value).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/u);
    }
  });

  it("labels preview data clearly in all supported locales", () => {
    expect(getPrayerPreviewNotice("ar")).toContain("تجريبية");
    expect(getPrayerPreviewNotice("en")).toContain("Preview");
    expect(getPrayerPreviewNotice("de")).toContain("Vorschau");
    expect(getPrayerPreviewNotice("tr")).toContain("önizleme");
  });
});
