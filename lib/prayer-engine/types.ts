export type PrayerKey =
  | "fajr"
  | "sunrise"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha";

export type ObligatoryPrayerKey = Exclude<PrayerKey, "sunrise">;

export type HighLatitudeSetting =
  | "middle_of_night"
  | "seventh_of_night"
  | "twilight_angle";

export type PrayerIqamaDelays = Record<ObligatoryPrayerKey, number>;
export type PrayerOffsets = Record<PrayerKey, number>;

export interface PrayerCalculationSettings {
  latitude: number;
  longitude: number;
  timezone: string;
  fajrAngle: number;
  ishaRule: "angle" | "fixed_minutes";
  ishaAngle: number | null;
  ishaMinutesAfterMaghrib: number | null;
  asrShadowFactor: 1 | 2;
  highLatitudeRule: HighLatitudeSetting;
  offsets: PrayerOffsets;
  iqamaDelays: PrayerIqamaDelays;
  calculationRevision: number;
  appliedCalculationRevision: number;
}

export type PrayerCalculationResult = { date: string } & Record<PrayerKey, string>;
