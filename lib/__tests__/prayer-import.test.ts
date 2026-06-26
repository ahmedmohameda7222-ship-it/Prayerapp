import { describe, expect, it } from "vitest";
import { parsePrayerTimesCsv } from "@/lib/csv/prayer-import";

describe("prayer CSV import", () => {
  it("maps required and optional columns", () => {
    const rows = parsePrayerTimesCsv("date,fajr,sunrise,dhuhr,asr,maghrib,isha,note\n2026-07-01,03:30,05:10,13:15,17:30,21:15,22:50,Published");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ date: "2026-07-01", fajr: "03:30", note: "Published" });
  });

  it("supports quoted commas", () => {
    const rows = parsePrayerTimesCsv('date,fajr,sunrise,dhuhr,asr,maghrib,isha,note\n2026-07-01,03:30,05:10,13:15,17:30,21:15,22:50,"Friday, first week"');
    expect(rows[0].note).toBe("Friday, first week");
  });

  it("rejects missing required columns", () => {
    expect(() => parsePrayerTimesCsv("date,fajr\n2026-07-01,03:30")).toThrow("Missing CSV column");
  });
});
