import { describe, expect, it } from "vitest";
import { getFridayPreviewMockData } from "@/lib/friday-preview-mock";

describe("Friday preview mock data", () => {
  it("builds two upcoming Fridays with three published services each", () => {
    const rows = getFridayPreviewMockData(new Date("2026-08-15T00:00:00.000Z"));

    expect(rows).toHaveLength(6);
    expect(rows.slice(0, 3).map((row) => row.date)).toEqual([
      "2026-08-21",
      "2026-08-21",
      "2026-08-21",
    ]);
    expect(rows.slice(0, 3).map((row) => row.prayerTime)).toEqual(["12:30", "13:30", "14:30"]);
    expect(rows.every((row) => row.published)).toBe(true);
  });

  it("includes the current Friday so live service switching can be previewed", () => {
    const rows = getFridayPreviewMockData(new Date("2026-08-21T08:00:00.000Z"));

    expect(rows[0]?.date).toBe("2026-08-21");
    expect(rows[3]?.date).toBe("2026-08-28");
  });
});
