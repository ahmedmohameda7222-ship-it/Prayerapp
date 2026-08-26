import { describe, expect, it } from "vitest";
import { getHomeJumuahSchedule } from "@/lib/home-jumuah";
import type { JumuahTime, PrayerTime } from "@/lib/types";

function prayer(date: string, dhuhr = "12:18", published = true): PrayerTime {
  return {
    id: `prayer:${date}`,
    date,
    fajr: "04:30",
    sunrise: "06:10",
    dhuhr,
    asr: "16:30",
    maghrib: "20:20",
    isha: "21:45",
    published,
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

function extra(id: string, date: string, prayerTime: string): JumuahTime {
  return {
    id,
    date,
    khutbahTime: prayerTime,
    prayerTime,
    language: "Arabic / German",
    notes: "",
    published: true,
  };
}

describe("Home Jumuah visibility", () => {
  it("appears from Wednesday using automatic Primary even with zero additional rows", () => {
    const result = getHomeJumuahSchedule(
      [prayer("2026-08-14", "12:18")],
      [],
      new Date("2026-08-12T08:00:00.000Z"),
    );

    expect(result?.daysUntil).toBe(2);
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]).toMatchObject({ id: "primary:2026-08-14", prayerTime: "12:18" });
  });

  it("does not appear three days before Friday under the normal policy", () => {
    expect(getHomeJumuahSchedule(
      [prayer("2026-08-14")],
      [],
      new Date("2026-08-11T08:00:00.000Z"),
    )).toBeUndefined();
  });

  it("allows the QA preview to show the next Friday outside the normal two-day window", () => {
    const result = getHomeJumuahSchedule(
      [prayer("2026-08-14")],
      [extra("two", "2026-08-14", "13:30")],
      new Date("2026-08-08T08:00:00.000Z"),
      { allowAnyFutureFriday: true },
    );

    expect(result?.date).toBe("2026-08-14");
    expect(result?.daysUntil).toBe(6);
    expect(result?.items.map((item) => item.prayerTime)).toEqual(["12:18", "13:30"]);
  });

  it("keeps Friday visible after Primary while an additional service remains", () => {
    const result = getHomeJumuahSchedule(
      [prayer("2026-08-14")],
      [extra("two", "2026-08-14", "13:30"), extra("three", "2026-08-14", "14:30")],
      new Date("2026-08-14T10:30:00.000Z"),
    );

    expect(result?.daysUntil).toBe(0);
    expect(result?.nextIndex).toBe(1);
  });

  it("disappears after the final Friday service because next Friday is outside the Home window", () => {
    const result = getHomeJumuahSchedule(
      [prayer("2026-08-14"), prayer("2026-08-21")],
      [extra("two", "2026-08-14", "13:30")],
      new Date("2026-08-14T12:00:00.000Z"),
    );

    expect(result).toBeUndefined();
  });
});
