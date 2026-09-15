import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
  Rounding,
} from "adhan";
import { ceilInstantToLocalMinute } from "./rounding";
import type {
  PrayerCalculationResult,
  PrayerCalculationSettings,
  PrayerKey,
} from "./types";

const PRAYER_KEYS: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

function requestedGregorianDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid prayer calculation date");
  }

  const result = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== date) {
    throw new Error("Invalid prayer calculation date");
  }
  return result;
}

export function calculatePrayerTimes(
  date: string,
  settings: PrayerCalculationSettings,
): PrayerCalculationResult {
  const coordinates = new Coordinates(settings.latitude, settings.longitude);
  const params = CalculationMethod.Other();

  params.fajrAngle = settings.fajrAngle;
  params.ishaAngle = settings.ishaRule === "angle" ? settings.ishaAngle! : 0;
  params.ishaInterval =
    settings.ishaRule === "fixed_minutes"
      ? settings.ishaMinutesAfterMaghrib!
      : 0;
  params.madhab = settings.asrShadowFactor === 2 ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule = {
    middle_of_night: HighLatitudeRule.MiddleOfTheNight,
    seventh_of_night: HighLatitudeRule.SeventhOfTheNight,
    twilight_angle: HighLatitudeRule.TwilightAngle,
  }[settings.highLatitudeRule];
  params.rounding = Rounding.None;

  const calculated = new PrayerTimes(
    coordinates,
    requestedGregorianDate(date),
    params,
  );

  const zeroMinuteFixedIsha =
    settings.ishaRule === "fixed_minutes" &&
    settings.ishaMinutesAfterMaghrib === 0;

  const result = { date } as PrayerCalculationResult;
  for (const key of PRAYER_KEYS) {
    const rawInstant =
      key === "isha" && zeroMinuteFixedIsha
        ? calculated.maghrib
        : calculated[key];
    if (!(rawInstant instanceof Date) || Number.isNaN(rawInstant.getTime())) {
      throw new Error(`Unable to calculate ${key} for ${date}`);
    }
    const adjusted = new Date(
      rawInstant.getTime() + settings.offsets[key] * 60_000,
    );
    result[key] = ceilInstantToLocalMinute(adjusted, settings.timezone);
  }

  return result;
}
