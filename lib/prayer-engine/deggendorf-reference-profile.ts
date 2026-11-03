import type { PrayerCalculationSettings } from "./types";

/**
 * Candidate astronomical calibration for the Deggendorf reference timetable
 * photographed for 2026-10-12 through 2026-11-09.
 *
 * This is a date-independent mathematical profile, NOT a table of saved times,
 * a declaration of the source app's exact calculation method, or mosque approval.
 * Review the regression test and Admin diff before using this in production.
 *
 * Calibration target: the five named prayer times (Fajr, Dhuhr, Asr,
 * Maghrib/Iftar, Isha) displayed in the supplied Deggendorf screenshot.
 * Sunrise is retained for astronomy and schedule consumers, not a prayer.
 * Sahur Ends/Imsak is Ramadan-only context outside this calculation profile.
 *
 * The parameters reproduce the photographed *displayed Fajr* values, not an
 * independently certified astronomical dawn onset. Never infer an extra
 * 20-minute shift or conflate Sahur/Imsak with canonical Fajr.
 * Mosque review is needed before production use.
 */
export const DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE = {
  latitude: 48.833,
  longitude: 12.967,
  timezone: "Europe/Berlin",
  fajrAngle: 16.5,
  ishaRule: "angle",
  ishaAngle: 17,
  ishaMinutesAfterMaghrib: null,
  asrShadowFactor: 1,
  highLatitudeRule: "twilight_angle",
  offsets: {
    fajr: -1,
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
