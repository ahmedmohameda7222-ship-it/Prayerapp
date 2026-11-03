import { describe, expect, it } from "vitest";
import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes, Rounding } from "adhan";
import { calculatePrayerTimes } from "./calculate";
import { DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE } from "./deggendorf-reference-profile";
import { validSettings } from "./test-settings";

// Transcribed from the user-supplied timetable screenshot for Deggendorf,
// spanning the 2026-10-25 Europe/Berlin daylight-saving transition.
// Reference expectations belong in TESTS ONLY, never database seed data.
// Column order: date | Fajr | Sunrise | Dhuhr | Asr | Iftar/Maghrib | Isha.
// Sahur Ends is a separate Ramadan/Imsak concern, intentionally excluded.
const screenshotRows = [
  "2026-10-12|05:47|07:20|13:02|15:56|18:32|20:09",
  "2026-10-13|05:49|07:22|13:01|15:54|18:30|20:07",
  "2026-10-14|05:50|07:23|13:01|15:53|18:28|20:05",
  "2026-10-15|05:52|07:25|13:01|15:51|18:26|20:03",
  "2026-10-16|05:53|07:26|13:01|15:50|18:24|20:01",
  "2026-10-17|05:54|07:28|13:00|15:48|18:22|19:59",
  "2026-10-20|05:59|07:32|13:00|15:44|18:17|19:54",
  "2026-10-21|06:00|07:34|13:00|15:42|18:15|19:52",
  "2026-10-22|06:02|07:35|13:00|15:41|18:13|19:50",
  "2026-10-23|06:03|07:37|12:59|15:39|18:11|19:49",
  "2026-10-24|06:05|07:38|12:59|15:38|18:09|19:47",
  "2026-10-25|05:06|06:40|11:59|14:36|17:08|18:45",
  "2026-10-26|05:08|06:42|11:59|14:35|17:06|18:44",
  "2026-10-27|05:09|06:43|11:59|14:34|17:04|18:42",
  "2026-10-28|05:10|06:45|11:59|14:32|17:02|18:40",
  "2026-10-29|05:12|06:46|11:59|14:31|17:01|18:39",
  "2026-10-30|05:13|06:48|11:59|14:30|16:59|18:37",
  "2026-10-31|05:15|06:49|11:59|14:28|16:57|18:36",
  "2026-11-01|05:16|06:51|11:59|14:27|16:56|18:34",
  "2026-11-02|05:18|06:53|11:59|14:26|16:54|18:33",
  "2026-11-03|05:19|06:54|11:59|14:24|16:53|18:32",
  "2026-11-04|05:20|06:56|11:59|14:23|16:51|18:30",
  "2026-11-05|05:22|06:57|11:59|14:22|16:49|18:29",
  "2026-11-06|05:23|06:59|11:59|14:21|16:48|18:28",
  "2026-11-07|05:24|07:01|11:59|14:20|16:46|18:26",
  "2026-11-08|05:26|07:02|11:59|14:18|16:45|18:25",
  "2026-11-09|05:27|07:04|11:59|14:17|16:44|18:24"
] as const;

const PRAYERS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
function minutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

describe("Deggendorf reference screenshot / Prayer Engine", () => {
  it("recalculates every photographed prayer minute exactly without date-specific overrides", () => {
    const profile = {
      ...validSettings,
      ...DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE,
    };
    const discrepancies: string[] = [];
    const differences: Record<string, number[]> = Object.fromEntries(PRAYERS.map((prayer) => [prayer, []]));
    for (const raw of screenshotRows) {
      const [date, ...prayers] = raw.split("|");
      const expected = Object.fromEntries(
        PRAYERS.map((key, i) => [key, prayers[i]]),
      );
      const generated = calculatePrayerTimes(date, profile);
      for (const key of PRAYERS) {
        const actualMinutes = minutes(generated[key]);
        const expectedMinutes = minutes(expected[key]);
        const delta = Math.abs(actualMinutes - expectedMinutes);
        differences[key].push(actualMinutes - expectedMinutes);
        if (delta !== 0) {
          discrepancies.push(`${date} ${key}: engine ${generated[key]}, screenshot ${expected[key]}, delta ${actualMinutes - expectedMinutes}`);
        }
      }
    }
    const summary = Object.fromEntries(
      PRAYERS.map((key) => [key, {
        min: Math.min(...differences[key]),
        max: Math.max(...differences[key]),
        exactCount: differences[key].filter((difference) => difference === 0).length,
        countOutsideExact: differences[key].filter((difference) => difference !== 0).length,
      }]),
    );
    expect(discrepancies, JSON.stringify(summary)).toEqual([]);
  });

  it("searches dawn and sunset solar depression angles against the photographed times", () => {
    const profile = DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE;
    const coordinates = new Coordinates(profile.latitude, profile.longitude);
    const references = screenshotRows.map((row) => {
      const [date, ...times] = row.split("|");
      const base = Date.parse(`${date}T00:00:00Z`);
      const utcOffset = date < "2026-10-25" ? 120 : 60;
      return {
        date,
        target: Object.fromEntries(PRAYERS.map((key, i) => [key,
          base + (minutes(times[i]) - utcOffset) * 60_000,
        ])) as Record<(typeof PRAYERS)[number], number>,
      };
    });
    const report: Record<string, unknown> = {};
    for (const prayer of ["fajr", "maghrib"] as const) {
      const candidates: Array<{ angle: number; exact: number; offset: number; span: number }> = [];
      const total = prayer === "fajr" ? 121 : 101;
      for (let i = 0; i < total; i++) {
        const angle = prayer === "fajr" ? 16.2 + i * 0.005 : 0.84 + i * 0.02;
        const params = CalculationMethod.Other();
        params.fajrAngle = prayer === "fajr" ? angle : profile.fajrAngle;
        params.ishaAngle = profile.ishaAngle!;
        params.maghribAngle = prayer === "maghrib" ? angle : 0;
        params.highLatitudeRule = HighLatitudeRule.TwilightAngle;
        params.madhab = Madhab.Shafi;
        params.rounding = Rounding.None;
        const windows = references.map(({ date, target }) => {
          const astronomical = new PrayerTimes(coordinates, new Date(`${date}T12:00:00Z`), params);
          const upper = (target[prayer] - astronomical[prayer].getTime()) / 60000;
          return { lower: upper - 1, upper };
        });
        let bestExact = 0;
        let bestOffset = 0;
        let bestSpan = 0;
        for (const w of windows) {
          const c = w.upper - 1e-7;
          const matching = windows.filter(x => x.lower < c && c <= x.upper);
          if(matching.length > bestExact) {
            bestExact = matching.length;
            const lower = Math.max(...matching.map(x => x.lower));
            const upper = Math.min(...matching.map(x => x.upper));
            bestOffset = (lower + upper) / 2;
            bestSpan = (upper - lower) * 60;
          }
        }
        candidates.push({
          angle: Number(angle.toFixed(3)),
          exact: bestExact,
          offset: Number(bestOffset.toFixed(4)),
          span: Number(bestSpan.toFixed(2)),
        });
      }
      candidates.sort((a,b)=>b.exact-a.exact||b.span-a.span);
      report[prayer] = candidates.slice(0, 12);
    }
    console.info("DEGGENDORF_SOLAR_ANGLE_FIT", JSON.stringify(report));
    expect(true).toBe(true);
  });

  it("generates a full year, both DST boundaries, and leap day without a local-date overflow", () => {
    const settings = { ...validSettings, ...DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE };
    for (let timestamp = Date.UTC(2027, 0, 1); timestamp < Date.UTC(2028, 0, 1); timestamp += 86_400_000) {
      const date = new Date(timestamp).toISOString().slice(0, 10);
      expect(() => calculatePrayerTimes(date, settings), date).not.toThrow();
    }
    expect(() => calculatePrayerTimes("2028-02-29", settings)).not.toThrow();
  });

  it("treats 2026-10-25 as Europe/Berlin DST, not a manual hour offset", () => {
    const settings = { ...validSettings, ...DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE };
    const saturday = calculatePrayerTimes("2026-10-24", settings);
    const sunday = calculatePrayerTimes("2026-10-25", settings);
    expect(minutes(saturday.dhuhr) - minutes(sunday.dhuhr)).toBe(60);
  });
});
