import type { PrayerCalculationSettings } from "./types";

/**
 * Candidate astronomical calibration for the Deggendorf reference timetable
 * photographed for 2026-10-12 through 2026-11-09.
 *
 * This is a date-independent mathematical profile, NOT a table of saved times,
 * a declaration of the source app's exact calculation method, or mosque approval.
 * Review the regression test and Admin diff before using this in production.
 *
 * The photographed "Sahur Ends" is 20 minutes before Fajr, and "Iftar"
 * corresponds to the astronomical Maghrib event. Neither is a separate
 * stored prayer-time field in Prayerapp.
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
  highLatitudeRule: "middle_of_night",
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
