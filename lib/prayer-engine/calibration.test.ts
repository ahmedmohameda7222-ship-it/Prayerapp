import { describe, expect, it } from "vitest";
import { comparePrayerDay } from "./calibration";

describe("prayer schedule calibration", () => {
  it("flags an unexplained delta above one minute", () => {
    const result = comparePrayerDay(
      {
        date: "2026-01-15",
        fajr: "06:00",
        sunrise: "08:00",
        dhuhr: "12:15",
        asr: "14:30",
        maghrib: "16:45",
        isha: "18:15",
      },
      {
        date: "2026-01-15",
        fajr: "06:02",
        sunrise: "08:00",
        dhuhr: "12:15",
        asr: "14:30",
        maghrib: "16:45",
        isha: "18:15",
      },
    );

    expect(result.fajr.deltaMinutes).toBe(2);
    expect(result.fajr.requiresInvestigation).toBe(true);
    expect(result.sunrise.requiresInvestigation).toBe(false);
  });

  it("does not flag an absolute delta of one minute", () => {
    const result = comparePrayerDay(
      {
        date: "2026-07-15",
        fajr: "03:15",
        sunrise: "05:15",
        dhuhr: "13:15",
        asr: "17:15",
        maghrib: "21:00",
        isha: "22:45",
      },
      {
        date: "2026-07-15",
        fajr: "03:14",
        sunrise: "05:15",
        dhuhr: "13:15",
        asr: "17:15",
        maghrib: "21:00",
        isha: "22:45",
      },
    );

    expect(result.fajr.deltaMinutes).toBe(-1);
    expect(result.fajr.requiresInvestigation).toBe(false);
  });
});
