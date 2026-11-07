import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildRecalculationPreview } from "./generate";
import { calculatePrayerTimes } from "./calculate";
import { DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE } from "./deggendorf-reference-profile";
import type { PrayerCalculationSettings } from "./types";

describe("one-time production operator preview of the REAL Prayer Engine", () => {
  it("generates 365 continuous future days from pinned adhan, without fixture lookup", () => {
    const settings: PrayerCalculationSettings = {
      ...DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE,
      offsets: { ...DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE.offsets },
      iqamaDelays: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 5, isha: 10 },
      calculationRevision: 1,
      appliedCalculationRevision: 0,
    };
    const startDate = "2026-11-07";
    const endDate = "2027-11-06";
    const expectedReferenceDate = calculatePrayerTimes("2026-11-03", settings);
    expect(expectedReferenceDate).toEqual({
      date: "2026-11-03",
      fajr: "05:19",
      sunrise: "06:54",
      dhuhr: "11:59",
      asr: "14:24",
      maghrib: "16:53",
      isha: "18:32",
    });
    const result = buildRecalculationPreview([], startDate, endDate, settings);
    const rows = result.rows.map((item) => item.next);
    expect(rows).toHaveLength(365);
    expect(rows[0]?.date).toBe(startDate);
    expect(rows.at(-1)?.date).toBe(endDate);
    const fields = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      expect(row.date).toBe(new Date(Date.UTC(2026, 10, 7 + i)).toISOString().slice(0, 10));
      for (const field of fields) {
        expect(row[field], `${row.date} ${field}`).toMatch(/^\d{2}:\d{2}$/);
      }
    }
    const json = JSON.stringify(rows);
    const sha = createHash("sha256").update(json).digest("hex");
    console.info("PRAYER_ENGINE_PREVIEW_HEADER " + JSON.stringify({
      source: "lib/prayer-engine/calculate.ts",
      package: "adhan@4.4.6",
      first: startDate, last: endDate, count: rows.length, sha256: sha,
    }));
    for (const row of rows) {
      console.info("PRAYER_ENGINE_ROW_JSON " + JSON.stringify(row));
    }
    console.info("PRAYER_ENGINE_PREVIEW_END " + sha);
  });
});
