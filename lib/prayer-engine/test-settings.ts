import type { PrayerCalculationSettings } from "./types";

/**
 * Synthetic settings for unit tests only.
 * These values are not an approved mosque calculation profile and must never be seeded.
 *
 * Keep this fixture representable by the canonical row model (one mosque-local
 * date plus HH:mm fields) across the calendar dates exercised by generation
 * tests. Cross-midnight behavior has dedicated rejection coverage.
 */
export const validSettings: PrayerCalculationSettings = {
  latitude: 48,
  longitude: 12,
  timezone: "Europe/Berlin",
  fajrAngle: 18,
  ishaRule: "angle",
  ishaAngle: 12,
  ishaMinutesAfterMaghrib: null,
  asrShadowFactor: 1,
  highLatitudeRule: "middle_of_night",
  offsets: {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  },
  iqamaDelays: {
    fajr: 0,
    dhuhr: 10,
    asr: 10,
    maghrib: 5,
    isha: 10,
  },
  calculationRevision: 1,
  appliedCalculationRevision: 1,
};
