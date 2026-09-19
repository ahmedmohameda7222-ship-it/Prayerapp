import { describe, expect, it } from "vitest";
import { calculatePrayerTimes } from "./calculate";
import { validSettings } from "./test-settings";

const toMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

const forwardMinuteDelta = (from: string, to: string) =>
  (toMinutes(to) - toMinutes(from) + 24 * 60) % (24 * 60);

describe("calculatePrayerTimes", () => {
  it("is deterministic and emits six HH:MM values", () => {
    const first = calculatePrayerTimes("2026-07-15", validSettings);
    const second = calculatePrayerTimes("2026-07-15", validSettings);

    expect(first).toEqual(second);
    expect(first.date).toBe("2026-07-15");
    for (const key of [
      "fajr",
      "sunrise",
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
    ] as const) {
      expect(first[key]).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    }
  });

  it("applies wrapper offsets exactly once before final ceiling", () => {
    const base = calculatePrayerTimes("2026-01-15", validSettings);
    const shifted = calculatePrayerTimes("2026-01-15", {
      ...validSettings,
      offsets: { ...validSettings.offsets, dhuhr: 7 },
    });

    expect(toMinutes(shifted.dhuhr) - toMinutes(base.dhuhr)).toBe(7);
  });

  it("supports fixed Isha intervals including zero minutes", () => {
    const zero = calculatePrayerTimes("2026-01-15", {
      ...validSettings,
      ishaRule: "fixed_minutes",
      ishaAngle: null,
      ishaMinutesAfterMaghrib: 0,
    });
    expect(zero.isha).toBe(zero.maghrib);

    const ninety = calculatePrayerTimes("2026-01-15", {
      ...validSettings,
      ishaRule: "fixed_minutes",
      ishaAngle: null,
      ishaMinutesAfterMaghrib: 90,
    });
    expect(forwardMinuteDelta(ninety.maghrib, ninety.isha)).toBe(90);
  });

  it("rejects invalid calendar dates", () => {
    expect(() => calculatePrayerTimes("2026-02-30", validSettings)).toThrow();
  });
});
