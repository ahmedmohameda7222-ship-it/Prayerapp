import { describe, expect, it } from "vitest";
import type { PrayerScheduleDiff } from "./generate";
import { buildRecalculationCsv } from "./preview-presentation";

const sample: PrayerScheduleDiff = {
  startDate: "2026-11-03",
  endDate: "2026-11-04",
  settingsRevision: 1,
  changedRowCount: 2,
  changedPrayerCount: 7,
  rows: [
    {
      date: "2026-11-03",
      previous: null,
      next: {
        date: "2026-11-03",
        fajr: "05:19",
        sunrise: "06:54",
        dhuhr: "11:59",
        asr: "14:24",
        maghrib: "16:53",
        isha: "18:32",
      },
      changedPrayers: ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"],
    },
    {
      date: "2026-11-04",
      previous: {
        date: "2026-11-04",
        fajr: "05:21",
        sunrise: "06:56",
        dhuhr: "11:59",
        asr: "14:23",
        maghrib: "16:51",
        isha: "18:30",
      },
      next: {
        date: "2026-11-04",
        fajr: "05:20",
        sunrise: "06:56",
        dhuhr: "11:59",
        asr: "14:23",
        maghrib: "16:51",
        isha: "18:30",
      },
      changedPrayers: ["fajr"],
    },
  ],
};

describe("Prayer schedule review CSV", () => {
  it("exports every proposed daily time with prior values, never Sahur or Imsak", () => {
    const csv = buildRecalculationCsv(sample);
    const lines = csv.trim().split("\n");

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      "date,status,fajr_before,fajr_after,sunrise_before,sunrise_after,dhuhr_before,dhuhr_after,asr_before,asr_after,maghrib_before,maghrib_after,isha_before,isha_after,changed_prayers",
    );
    expect(lines[1]).toBe(
      "2026-11-03,new,,05:19,,06:54,,11:59,,14:24,,16:53,,18:32,fajr|sunrise|dhuhr|asr|maghrib|isha",
    );
    expect(lines[2]).toBe(
      "2026-11-04,changed,05:21,05:20,06:56,06:56,11:59,11:59,14:23,14:23,16:51,16:51,18:30,18:30,fajr",
    );
    expect(csv).not.toMatch(/sahur|imsak/i);
  });

  it("exports unchanged rows as unchanged, without inventing a change", () => {
    const identical = { ...sample.rows[1], changedPrayers: [], next: sample.rows[1].previous! };
    const csv = buildRecalculationCsv({ ...sample, rows: [identical] });
    expect(csv.split("\n")[1]).toContain("2026-11-04,unchanged,");
  });
});
