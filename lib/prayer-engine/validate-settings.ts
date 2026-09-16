import { APP_TIME_ZONE } from "@/lib/date-utils";
import type {
  HighLatitudeSetting,
  PrayerCalculationSettings,
  PrayerIqamaDelays,
  PrayerKey,
  PrayerOffsets,
} from "./types";

const PRAYER_KEYS: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];
const IQAMA_KEYS: Array<keyof PrayerIqamaDelays> = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];
const HIGH_LATITUDE_RULES: HighLatitudeSetting[] = [
  "middle_of_night",
  "seventh_of_night",
  "twilight_angle",
];

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${field}`);
  }
  return value as Record<string, unknown>;
}

function finiteNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function positiveAngle(value: unknown, field: string): number {
  const result = finiteNumber(value, field, Number.MIN_VALUE, 30);
  if (result <= 0) throw new Error(`Invalid ${field}`);
  return result;
}

function integerInRange(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number {
  const result = finiteNumber(value, field, min, max);
  if (!Number.isInteger(result)) throw new Error(`Invalid ${field}`);
  return result;
}

function validateTimezone(value: unknown): string {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    throw new Error("Invalid timezone");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
  } catch {
    throw new Error("Invalid timezone");
  }
  if (value !== APP_TIME_ZONE) {
    throw new Error("Invalid timezone");
  }
  return value;
}

function validateOffsets(value: unknown): PrayerOffsets {
  const source = asObject(value, "offsets");
  return Object.fromEntries(
    PRAYER_KEYS.map((key) => [
      key,
      integerInRange(source[key], `${key} offset`, -60, 60),
    ]),
  ) as unknown as PrayerOffsets;
}

function validateIqamaDelays(value: unknown): PrayerIqamaDelays {
  const source = asObject(value, "iqamaDelays");
  return Object.fromEntries(
    IQAMA_KEYS.map((key) => [
      key,
      integerInRange(source[key], `${key} Iqama delay`, 0, 180),
    ]),
  ) as unknown as PrayerIqamaDelays;
}

export function validatePrayerCalculationSettings(
  value: unknown,
): PrayerCalculationSettings {
  const source = asObject(value, "prayer calculation settings");
  const latitude = finiteNumber(source.latitude, "latitude", -90, 90);
  const longitude = finiteNumber(source.longitude, "longitude", -180, 180);
  const timezone = validateTimezone(source.timezone);
  const fajrAngle = positiveAngle(source.fajrAngle, "Fajr angle");

  if (source.ishaRule !== "angle" && source.ishaRule !== "fixed_minutes") {
    throw new Error("Invalid Isha rule");
  }
  const ishaRule = source.ishaRule;
  let ishaAngle: number | null;
  let ishaMinutesAfterMaghrib: number | null;
  if (ishaRule === "angle") {
    ishaAngle = positiveAngle(source.ishaAngle, "Isha angle");
    if (source.ishaMinutesAfterMaghrib !== null) {
      throw new Error("Isha fixed minutes must be null in angle mode");
    }
    ishaMinutesAfterMaghrib = null;
  } else {
    if (source.ishaAngle !== null) {
      throw new Error("Isha angle must be null in fixed-minute mode");
    }
    ishaAngle = null;
    ishaMinutesAfterMaghrib = integerInRange(
      source.ishaMinutesAfterMaghrib,
      "Isha minutes after Maghrib",
      0,
      240,
    );
  }

  const asrShadowFactor = integerInRange(
    source.asrShadowFactor,
    "Asr shadow factor",
    1,
    2,
  );
  if (asrShadowFactor !== 1 && asrShadowFactor !== 2) {
    throw new Error("Invalid Asr shadow factor");
  }

  if (
    typeof source.highLatitudeRule !== "string" ||
    !HIGH_LATITUDE_RULES.includes(source.highLatitudeRule as HighLatitudeSetting)
  ) {
    throw new Error("Invalid high-latitude rule");
  }

  return {
    latitude,
    longitude,
    timezone,
    fajrAngle,
    ishaRule,
    ishaAngle,
    ishaMinutesAfterMaghrib,
    asrShadowFactor,
    highLatitudeRule: source.highLatitudeRule as HighLatitudeSetting,
    offsets: validateOffsets(source.offsets),
    iqamaDelays: validateIqamaDelays(source.iqamaDelays),
    calculationRevision: integerInRange(
      source.calculationRevision,
      "calculation revision",
      1,
      Number.MAX_SAFE_INTEGER,
    ),
    appliedCalculationRevision: integerInRange(
      source.appliedCalculationRevision,
      "applied calculation revision",
      0,
      Number.MAX_SAFE_INTEGER,
    ),
  };
}
