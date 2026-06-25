import { describe, it, expect } from "vitest";
import { getPrayerForDate, getIqama, getNextPrayer, prayerOrder, formatCountdown } from "@/lib/prayer-utils";
import type { PrayerTime } from "@/lib/types";

const samplePrayer: PrayerTime = {
  id: "pt-1",
  date: "2026-06-24",
  fajr: "03:19",
  sunrise: "05:07",
  dhuhr: "13:13",
  asr: "17:32",
  maghrib: "21:19",
  isha: "22:57",
  fajrIqama: "04:00",
  dhuhrIqama: "13:30",
  asrIqama: "18:00",
  maghribIqama: "21:25",
  ishaIqama: "23:10",
  note: "Test",
  published: true,
  updatedAt: "2026-06-20T18:30:00+02:00",
};

describe("prayer-utils", () => {
  it("prayerOrder has 6 prayers", () => {
    expect(prayerOrder).toHaveLength(6);
    expect(prayerOrder[0]).toBe("fajr");
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

  it("getIqama returns iqama for prayers with iqama", () => {
    expect(getIqama(samplePrayer, "fajr")).toBe("04:00");
    expect(getIqama(samplePrayer, "dhuhr")).toBe("13:30");
  });

  it("getIqama returns undefined for sunrise", () => {
    expect(getIqama(samplePrayer, "sunrise")).toBeUndefined();
  });

  it("getIqama returns undefined when iqama is missing", () => {
    const noIqama: PrayerTime = { ...samplePrayer, fajrIqama: undefined };
    expect(getIqama(noIqama, "fajr")).toBeUndefined();
  });

  it("formatCountdown formats milliseconds correctly", () => {
    expect(formatCountdown(3661000)).toBe("01:01:01");
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(-1000)).toBe("00:00:00");
  });

  it("getNextPrayer returns the next prayer after now", () => {
    const now = new Date("2026-06-24T12:00:00+02:00");
    const next = getNextPrayer(samplePrayer, now);
    expect(next.name).toBe("dhuhr");
    expect(next.time).toBe("13:13");
  });
});
