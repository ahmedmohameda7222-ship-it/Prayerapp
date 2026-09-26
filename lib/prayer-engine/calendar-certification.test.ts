import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculatePrayerTimes } from "./calculate";
import { PRAYER_ENGINE_OPERATIONAL_APPROVAL_POLICY } from "./production-approval";
import { ceilInstantToLocalMinute } from "./rounding";
import { validSettings } from "./test-settings";

const calendarCases = [
  ["winter", "2026-01-15"],
  ["dst-start-before", "2026-03-28"],
  ["dst-start-after", "2026-03-29"],
  ["summer", "2026-06-21"],
  ["dst-end-before", "2026-10-24"],
  ["dst-end-after", "2026-10-25"],
  ["winter-solstice", "2026-12-21"],
  ["year-end", "2026-12-31"],
] as const;

const HHMM = /^\d{2}:\d{2}$/;

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

describe("Prayer Engine calendar certification invariants", () => {
  it.each(calendarCases)(
    "is deterministic for the synthetic %s harness on %s",
    (_name, date) => {
      const first = calculatePrayerTimes(date, validSettings);
      const second = calculatePrayerTimes(date, validSettings);
      expect(second).toEqual(first);
      expect(first.date).toBe(date);
      for (const key of ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const) {
        expect(first[key]).toMatch(HHMM);
      }
    },
  );

  it("ceil-rounds only after preserving second-level precision", () => {
    expect(
      ceilInstantToLocalMinute(new Date("2026-01-15T15:42:00.000Z"), "Europe/Berlin"),
    ).toBe("16:42");
    expect(
      ceilInstantToLocalMinute(new Date("2026-01-15T15:42:00.001Z"), "Europe/Berlin"),
    ).toBe("16:43");
    expect(
      ceilInstantToLocalMinute(new Date("2026-01-15T15:42:59.999Z"), "Europe/Berlin"),
    ).toBe("16:43");
  });

  it("applies configured whole-minute offsets deterministically before final storage", () => {
    const baseline = calculatePrayerTimes("2026-01-15", validSettings);
    const shifted = calculatePrayerTimes("2026-01-15", {
      ...validSettings,
      offsets: { ...validSettings.offsets, dhuhr: validSettings.offsets.dhuhr + 3 },
    });
    expect(minutes(shifted.dhuhr) - minutes(baseline.dhuhr)).toBe(3);
  });

  it("uses IANA Europe/Berlin DST mechanics at both 2026 transitions", () => {
    expect(
      ceilInstantToLocalMinute(new Date("2026-03-29T00:59:00.000Z"), "Europe/Berlin"),
    ).toBe("01:59");
    expect(
      ceilInstantToLocalMinute(new Date("2026-03-29T01:00:00.000Z"), "Europe/Berlin"),
    ).toBe("03:00");
    expect(
      ceilInstantToLocalMinute(new Date("2026-10-25T00:59:00.000Z"), "Europe/Berlin"),
    ).toBe("02:59");
    expect(
      ceilInstantToLocalMinute(new Date("2026-10-25T01:00:00.000Z"), "Europe/Berlin"),
    ).toBe("02:00");
  });

  it("contains no manual CET/CEST or fixed-hour DST patch in the adapter", () => {
    const source = readFileSync("lib/prayer-engine/calculate.ts", "utf8");
    expect(source).not.toMatch(/\bCET\b|\bCEST\b|daylight\s+sav|dst\s*(?:offset|patch)/i);
    expect(source).not.toMatch(/getTimezoneOffset\(|setHours\(/);
  });

  it("keeps approval operator-controlled without a compile-time religious gate", () => {
    const actions = readFileSync("app/admin/prayer-engine/actions.ts", "utf8");
    const admin = readFileSync("app/admin/prayer-engine/PrayerEngineAdmin.tsx", "utf8");
    expect(actions).not.toContain("PRODUCTION_PRAYER_PROFILE_APPROVED");
    expect(admin).not.toContain("profileApproved");
    expect(PRAYER_ENGINE_OPERATIONAL_APPROVAL_POLICY).toMatch(/operator-controlled/i);
    expect(PRAYER_ENGINE_OPERATIONAL_APPROVAL_POLICY).toMatch(/preview/i);
    expect(PRAYER_ENGINE_OPERATIONAL_APPROVAL_POLICY).toMatch(/optional reference/i);
  });
});
