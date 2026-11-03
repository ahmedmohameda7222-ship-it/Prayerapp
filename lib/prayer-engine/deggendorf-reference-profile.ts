import type { PrayerCalculationSettings } from "./types";

/**
 * Candidate astronomical calibration for the Deggendorf reference timetable
 * photographed for 2026-10-12 through 2026-11-09.
 *
 * This is a date-independent mathematical profile, NOT a table of saved times,
 * a declaration of the source app's exact calculation method, or mosque approval.
 * Review the regression test and Admin diff before using this in production.
 *
 * Fazilet Calendar source: 19° Imsak, 17° Isha, plus religious
 * safeguards (temkin). Sahur Ends is Imsak / dawn onset, while the
 * screenshot's "Fajr" is a time 20 minutes later. Prayerapp's canonical
 * Fajr field represents dawn onset, NOT the later recommended Fajr
 * display or a mosque-defined Iqama time.
 *
 * Reference: https://fazilettakvimi.com/tr/sikca-sorulan-sorular/muhteva-ile-ilgili-sorular/
 * Iftar is Maghrib. Astronomical offsets are inferred and must be
 * mosque-reviewed; a single generic astronomy library does not reproduce
 * Fazilet's full, proprietary city/season-specific temkin calculations.
 */
export const DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE = {
  latitude: 48.833,
  longitude: 12.967,
  timezone: "Europe/Berlin",
  fajrAngle: 19,
  ishaRule: "angle",
  ishaAngle: 17,
  ishaMinutesAfterMaghrib: null,
  asrShadowFactor: 1,
  highLatitudeRule: "twilight_angle",
  offsets: {
    fajr: -6,
    sunrise: -4,
    dhuhr: 7,
    asr: 6,
    maghrib: 8,
    isha: 6,
  },
} as const satisfies Pick<
  PrayerCalculationSettings,
  | "latitude"
  | "longitude"
  | "timezone"
  | "fajrAngle"
  | "ishaRule"
  | "ishaAngle"
  | "ishaMinutesAfterMaghrib"
  | "asrShadowFactor"
  | "highLatitudeRule"
  | "offsets"
>;
