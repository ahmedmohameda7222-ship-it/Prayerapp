import { describe, expect, it } from "vitest";
import { buildPublicOfflineSchedule, splitOfflinePrayerRange } from "../offline-prayer-data";
import type { PrayerTime } from "../types";

const day: PrayerTime = {
  id: "private-database-row-id", date: "2026-11-13",
  fajr: "05:32", sunrise: "07:18", dhuhr: "12:04",
  asr: "14:19", maghrib: "16:40", isha: "18:22",
  published: true, updatedAt: "2026-11-12T08:00:00Z",
  note: "Public prayer note",
};

const iqama = { fajr: 20, dhuhr: 10, asr: 10, maghrib: 5, isha: 10 };

describe("offline prayer snapshot public data boundary", () => {
  it("retains only the published daily times and approved public iqama values", () => {
    const result = buildPublicOfflineSchedule({
      rows: [day, { ...day, id: "unpublished", date: "2026-11-14", published: false }, { ...day, id: "qa-mock", date: "2026-11-15", note: "SUPABASE_QA_MOCK" }],
      timezone: "Europe/Berlin", iqamaDelays: iqama,
      fetchedAt: "2026-11-12T15:00:00.000Z",
    });
    expect(result).toEqual({
      schemaVersion: 1,
      timezone: "Europe/Berlin",
      fetchedAt: "2026-11-12T15:00:00.000Z",
      iqamaDelays: iqama,
      rows: [{
        date: day.date, fajr: day.fajr, sunrise: day.sunrise,
        dhuhr: day.dhuhr, asr: day.asr, maghrib: day.maghrib, isha: day.isha,
      }],
    });
    expect(JSON.stringify(result)).not.toContain("private-database-row-id");
    expect(JSON.stringify(result)).not.toContain("unpublished");
    expect(JSON.stringify(result)).not.toContain("qa-mock");
  });

  it("rejects duplicated, unsorted or corrupt published prayer dates instead of caching incorrect prayers", () => {
    const base = { timezone: "Europe/Berlin", iqamaDelays: iqama, fetchedAt: "2026-11-12T15:00:00.000Z" };
    expect(() => buildPublicOfflineSchedule({ ...base, rows: [day, day] })).toThrow();
    expect(() => buildPublicOfflineSchedule({
      ...base, rows: [{ ...day, date: "2026-11-14" }, day],
    })).toThrow();
    expect(() => buildPublicOfflineSchedule({
      ...base, rows: [{ ...day, fajr: "99:99" }],
    })).toThrow();
  });

  it("never invents timetable rows or iqama delays when optional data is absent", () => {
    const result = buildPublicOfflineSchedule({
      rows: [], timezone: "Europe/Berlin", iqamaDelays: null,
      fetchedAt: "2026-11-12T15:00:00.000Z",
    });
    expect(result.rows).toEqual([]);
    expect(result.iqamaDelays).toBeNull();
  });

  it("rejects invalid timezone, negative or noninteger iqama delays and unsafe timestamps", () => {
    const base = { rows: [day], fetchedAt: "2026-11-12T15:00:00.000Z", iqamaDelays: iqama };
    expect(() => buildPublicOfflineSchedule({ ...base, timezone: "Not/A_Zone" })).toThrow();
    expect(() => buildPublicOfflineSchedule({ ...base, timezone: "Europe/Berlin", iqamaDelays: { ...iqama, asr: -1 } })).toThrow();
    expect(() => buildPublicOfflineSchedule({ ...base, timezone: "Europe/Berlin", fetchedAt: "bad-date" })).toThrow();
  });
});

describe("bounded Supabase offline snapshot RPC ranges", () => {
  it("covers a full year, without exceeding the 93-day existing RPC limit", () => {
    const ranges = splitOfflinePrayerRange("2026-11-12", 365);
    expect(ranges).toHaveLength(5);
    expect(ranges[0].from).toBe("2026-11-11");
    expect(ranges[ranges.length - 1].through).toBe("2027-11-12");
    for (const range of ranges) {
      const difference = (Date.parse(range.through) - Date.parse(range.from)) / 86400000;
      expect(difference).toBeLessThanOrEqual(93);
    }
    const allDays = ranges.flatMap(range => {
      const dates = [];
      for (let t = Date.parse(range.from); t <= Date.parse(range.through); t += 86400000) {
        dates.push(new Date(t).toISOString().slice(0, 10));
      }
      return dates;
    });
    expect(allDays).toHaveLength(367);
    expect(new Set(allDays).size).toBe(367);
  });

  it("preserves leap day and contiguous calendar dates across DST", () => {
    const ranges = splitOfflinePrayerRange("2028-02-28", 365);
    const allDays = ranges.flatMap(range => {
      const dates = [];
      for (let t = Date.parse(range.from); t <= Date.parse(range.through); t += 86400000) {
        dates.push(new Date(t).toISOString().slice(0, 10));
      }
      return dates;
    });
    expect(allDays).toContain("2028-02-29");
    expect(allDays).toContain("2028-03-26");
    expect(allDays).toContain("2028-10-29");
    expect(allDays).toHaveLength(367);
  });
});
