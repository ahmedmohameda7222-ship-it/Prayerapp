import { describe, expect, it } from "vitest";
import { addDaysIso, addMonthsIso, formatHijriDate, monthBoundsIso, startOfWeekIso, todayIso, zonedDateTime } from "@/lib/date-utils";

describe("Berlin date utilities", () => {
  it("resolves the calendar day in Europe/Berlin", () => {
    expect(todayIso(new Date("2026-01-01T23:30:00Z"))).toBe("2026-01-02");
  });

  it("moves across date and month boundaries", () => {
    expect(addDaysIso("2026-02-28", 1)).toBe("2026-03-01");
    expect(addMonthsIso("2026-01-31", 1)).toBe("2026-02-28");
    expect(monthBoundsIso("2026-02-12")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(startOfWeekIso("2026-06-27")).toBe("2026-06-22");
  });

  it("formats the Umm al-Qura Hijri calendar date", () => {
    expect(formatHijriDate("2026-06-27", "en")).toBe("12 Muharram 1448 AH");
  });

  it("uses German daylight-saving offsets", () => {
    expect(zonedDateTime("2026-01-15", "12:00").toISOString()).toBe("2026-01-15T11:00:00.000Z");
    expect(zonedDateTime("2026-06-15", "12:00").toISOString()).toBe("2026-06-15T10:00:00.000Z");
  });
});
