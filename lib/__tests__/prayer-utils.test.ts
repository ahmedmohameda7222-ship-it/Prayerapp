import { describe, it, expect } from "vitest";
import {
  deriveIqamaInstant,
  derivePrayerIqamaTimes,
  getPrayerForDate,
  getNextPrayer,
  getNextPrayerFromSchedule,
  prayerOrder,
  formatCountdown,
} from "@/lib/prayer-utils";
import { zonedDateTime } from "@/lib/date-utils";
import type { PrayerTime } from "@/lib/types";
import type { PrayerIqamaDelays } from "@/lib/prayer-engine/types";
import { getSmartNextAction } from "@/lib/home-utils";

const samplePrayer: PrayerTime = {
  id: "pt-1",
  date: "2026-06-24",
  fajr: "03:19",
  sunrise: "05:07",
  dhuhr: "13:13",
  asr: "17:32",
  maghrib: "21:19",
  isha: "22:57",
  note: "Test",
  published: true,
  updatedAt: "2026-06-20T18:30:00+02:00",
};

const BERLIN = "Europe/Berlin";

const delays: PrayerIqamaDelays = {
  fajr: 0,
  dhuhr: 10,
  asr: 10,
  maghrib: 5,
  isha: 10,
};

describe("prayer-utils", () => {
  it("prayerOrder has 6 prayer-table rows including Sunrise", () => {
    expect(prayerOrder).toHaveLength(6);
    expect(prayerOrder[0]).toBe("fajr");
    expect(prayerOrder).toContain("sunrise");
    expect(prayerOrder[5]).toBe("isha");
  });

  it("getPrayerForDate finds published prayer by date", () => {
    const found = getPrayerForDate([samplePrayer], "2026-06-24");
    expect(found).toBeDefined();
    expect(found?.fajr).toBe("03:19");
  });

  it("getPrayerForDate returns undefined for unpublished", () => {
    const unpublished = { ...samplePrayer, published: false };
    const found = getPrayerForDate([unpublished], "2026-06-24");
    expect(found).toBeUndefined();
  });

  it("derives Iqama from stored prayer start plus shared delay", () => {
    expect(deriveIqamaInstant("2026-09-15", "18:00", 0, BERLIN).getTime()).toBe(
      zonedDateTime("2026-09-15", "18:00").getTime(),
    );
    expect(deriveIqamaInstant("2026-09-15", "23:58", 5, BERLIN).getTime()).toBe(
      zonedDateTime("2026-09-15", "23:58").getTime() + 5 * 60_000,
    );
  });

  it("uses the supplied mosque timezone for prayer instants, Iqama, and next-prayer targets", () => {
    const timezone = "Asia/Tokyo";
    expect(
      deriveIqamaInstant("2026-09-21", "05:00", 10, timezone).toISOString(),
    ).toBe("2026-09-20T20:10:00.000Z");

    const tokyoPrayer = {
      ...samplePrayer,
      id: "tokyo",
      date: "2026-09-21",
      fajr: "05:00",
      dhuhr: "12:00",
      asr: "15:00",
      maghrib: "18:00",
      isha: "19:30",
    };
    expect(derivePrayerIqamaTimes(tokyoPrayer, delays, timezone).fajr).toBe("05:00");

    const next = getNextPrayerFromSchedule(
      [tokyoPrayer],
      new Date("2026-09-20T19:30:00.000Z"),
      timezone,
    );
    expect(next?.name).toBe("fajr");
    expect(next?.target.toISOString()).toBe("2026-09-20T20:00:00.000Z");
  });

  it("derives shared Iqama display times, keeps zero delay, and never creates Sunrise Iqama", () => {
    const iqama = derivePrayerIqamaTimes(samplePrayer, delays, BERLIN);
    expect(iqama.fajr).toBe("03:19");
    expect(iqama.dhuhr).toBe("13:23");
    expect(iqama.asr).toBe("17:42");
    expect(iqama.maghrib).toBe("21:24");
    expect(iqama.isha).toBe("23:07");
    expect("sunrise" in iqama).toBe(false);
  });

  it("does not expose normal Friday Dhuhr Iqama because Friday Dhuhr is primary Jumuah", () => {
    const friday = { ...samplePrayer, id: "pt-friday", date: "2026-06-26" };
    expect(derivePrayerIqamaTimes(friday, delays, BERLIN).dhuhr).toBeUndefined();
  });

  it("rejects invalid shared Iqama delays", () => {
    expect(() => deriveIqamaInstant("2026-09-15", "18:00", -1, BERLIN)).toThrow();
    expect(() => deriveIqamaInstant("2026-09-15", "18:00", 1.5, BERLIN)).toThrow();
  });

  it("formatCountdown formats milliseconds correctly", () => {
    expect(formatCountdown(3661000)).toBe("01:01:01");
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(-1000)).toBe("00:00:00");
  });

  it("getNextPrayer returns the next obligatory prayer after now", () => {
    const now = new Date("2026-06-24T12:00:00+02:00");
    const next = getNextPrayer(samplePrayer, now, BERLIN);
    expect(next?.name).toBe("dhuhr");
    expect(next?.time).toBe("13:13");
  });

  it("does not fabricate tomorrow Fajr from today's row after Isha", () => {
    const afterIsha = new Date("2026-06-24T23:30:00+02:00");
    expect(getNextPrayer(samplePrayer, afterIsha, BERLIN)).toBeUndefined();
  });

  it("uses tomorrow's actual published Fajr when a multi-day schedule is available", () => {
    const tomorrow = {
      ...samplePrayer,
      id: "pt-2",
      date: "2026-06-25",
      fajr: "03:21",
    };
    const afterIsha = new Date("2026-06-24T23:30:00+02:00");
    const next = getNextPrayerFromSchedule([samplePrayer, tomorrow], afterIsha, BERLIN);
    expect(next?.name).toBe("fajr");
    expect(next?.time).toBe("03:21");
    expect(next?.date).toBe("2026-06-25");
  });

  it("does not treat Sunrise as the next prayer after Fajr", () => {
    const afterFajrBeforeSunrise = new Date("2026-06-24T04:00:00+02:00");
    const next = getNextPrayerFromSchedule(
      [samplePrayer],
      afterFajrBeforeSunrise,
      BERLIN,
    );
    expect(next?.name).toBe("dhuhr");
    expect(next?.time).toBe("13:13");
  });
});

describe("getSmartNextAction", () => {
  it("prioritizes after-prayer Azkar shortly after an obligatory prayer", () => {
    const now = new Date("2026-06-24T13:30:00+02:00");
    expect(getSmartNextAction([samplePrayer], now, BERLIN)).toBe("afterPrayer");
  });

  it("recommends the expected Azkar for morning, evening, and night", () => {
    expect(
      getSmartNextAction(
        [samplePrayer],
        new Date("2026-06-24T10:00:00+02:00"),
        BERLIN,
      ),
    ).toBe("morning");
    expect(
      getSmartNextAction(
        [samplePrayer],
        new Date("2026-06-24T19:00:00+02:00"),
        BERLIN,
      ),
    ).toBe("evening");
    expect(
      getSmartNextAction(
        [samplePrayer],
        new Date("2026-06-24T23:50:00+02:00"),
        BERLIN,
      ),
    ).toBe("sleep");
  });

  it("prefers Friday during the daytime Friday window", () => {
    const friday = { ...samplePrayer, id: "pt-friday", date: "2026-06-26" };
    expect(
      getSmartNextAction([friday], new Date("2026-06-26T11:00:00+02:00"), BERLIN),
    ).toBe("friday");
  });
});
