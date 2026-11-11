import { describe, expect, it } from "vitest";
import { calculatePrayerTimes } from "./calculate";
import { validSettings } from "./test-settings";

const KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;

function minuteOfDay(clock: string): number {
  const [hour, minute] = clock.split(":").map(Number);
  return hour * 60 + minute;
}

function datesInYear(year: number): string[] {
  const result: string[] = [];
  const day = new Date(Date.UTC(year, 0, 1));
  while (day.getUTCFullYear() === year) {
    result.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return result;
}

describe("Prayer Engine full-year seasonal and DST regression", () => {
  it.each([
    [2026, 365],
    [2028, 366],
  ])("produces ordered mosque-local six-time rows on every date in %i", (year, expectedDays) => {
    const dates = datesInYear(year);
    expect(dates).toHaveLength(expectedDays);
    const actualDates: string[] = [];
    for (const date of dates) {
      const row = calculatePrayerTimes(date, validSettings);
      expect(row.date).toBe(date);
      const times = KEYS.map((key) => {
        expect(row[key], `${date} ${key}`).toMatch(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
        return minuteOfDay(row[key]);
      });
      for (let index = 1; index < times.length; index += 1) {
        expect(times[index], `${date}: ${KEYS[index - 1]} must precede ${KEYS[index]}`)
          .toBeGreaterThan(times[index - 1]);
      }
      actualDates.push(row.date);
    }
    expect(actualDates).toEqual(dates);
  });

  it("uses the Berlin clock transition rather than silently applying a fixed UTC offset", () => {
    const beforeSpring = calculatePrayerTimes("2026-03-28", validSettings);
    const spring = calculatePrayerTimes("2026-03-29", validSettings);
    const beforeFall = calculatePrayerTimes("2026-10-24", validSettings);
    const fall = calculatePrayerTimes("2026-10-25", validSettings);

    const springJump = minuteOfDay(spring.sunrise) - minuteOfDay(beforeSpring.sunrise);
    const fallJump = minuteOfDay(fall.sunrise) - minuteOfDay(beforeFall.sunrise);
    expect(springJump).toBeGreaterThan(30);
    expect(springJump).toBeLessThan(90);
    expect(fallJump).toBeLessThan(-30);
    expect(fallJump).toBeGreaterThan(-90);
  });

  it("keeps fixed 90-minute Isha relative to Maghrib across all calendar months", () => {
    const fixedSettings = {
      ...validSettings,
      ishaRule: "fixed_minutes" as const,
      ishaAngle: null,
      ishaMinutesAfterMaghrib: 90,
    };
    for (let month = 1; month <= 12; month += 1) {
      const date = `2026-${String(month).padStart(2, "0")}-15`;
      const row = calculatePrayerTimes(date, fixedSettings);
      expect(minuteOfDay(row.isha) - minuteOfDay(row.maghrib), date).toBe(90);
    }
  });
});
