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
 * The fit uses fractional-minute astronomical offsets and an optional
 * Maghrib solar angle. It is a model fitted to the observed October-November
 * window, NOT a verified year-round Fazilet methodology. Its exactness is
 * checked against independent test-only screenshot data, never loaded at
 * runtime. Mosque review is needed before production use.
 */
export const DEGGENDORF_SCREENSHOT_REFERENCE_PROFILE = {
  latitude: 48.833,
  longitude: 12.967,
  timezone: "Europe/Berlin",
  fajrAngle: 19.2,
  maghribAngle: 1.33,
  ishaRule: "angle",
  ishaAngle: 17,
  ishaMinutesAfterMaghrib: null,
  asrShadowFactor: 1,
  highLatitudeRule: "twilight_angle",
  offsets: {
    fajr: 15.15833,
    sunrise: -4.18333,
    dhuhr: 6.51667,
    asr: 5.86667,
    maghrib: 3.99167,
    isha: 5.23333,
  },
} as const satisfies Pick<
  PrayerCalculationSettings,
  | "latitude"
  | "longitude"
  | "timezone"
  | "fajrAngle"
  | "maghribAngle"
  | "ishaRule"
  | "ishaAngle"
  | "ishaMinutesAfterMaghrib"
  | "asrShadowFactor"
  | "highLatitudeRule"
  | "offsets"
>;
