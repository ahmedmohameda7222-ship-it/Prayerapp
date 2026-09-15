import { APP_TIME_ZONE, zonedDateTime } from "@/lib/date-utils";
import { calculatePrayerTimes } from "./calculate";
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

export interface CalibrationPrayerComparison {
  existing: string;
  generated: string;
  deltaMinutes: number;
  requiresInvestigation: boolean;
}

export type PrayerDayComparison = { date: string } & Record<
  PrayerKey,
  CalibrationPrayerComparison
>;

export interface CalibrationReport {
  startDate: string | null;
  endDate: string | null;
  settingsRevision: number;
  maximumAbsoluteDeltaMinutes: number;
  requiresInvestigation: boolean;
  days: PrayerDayComparison[];
}

export function comparePrayerDay(
  existing: PrayerCalculationResult,
  generated: PrayerCalculationResult,
): PrayerDayComparison {
  if (existing.date !== generated.date) {
    throw new Error("Calibration rows must have the same date");
  }

  const result = { date: existing.date } as PrayerDayComparison;
  for (const key of PRAYER_KEYS) {
    const existingInstant = zonedDateTime(existing.date, existing[key]);
    const generatedInstant = zonedDateTime(generated.date, generated[key]);
    const deltaMinutes =
      (generatedInstant.getTime() - existingInstant.getTime()) / 60_000;
    result[key] = {
      existing: existing[key],
      generated: generated[key],
      deltaMinutes,
      requiresInvestigation: Math.abs(deltaMinutes) > 1,
    };
  }
  return result;
}

export function calibrateSchedule(
  existing: PrayerCalculationResult[],
  settings: PrayerCalculationSettings,
): CalibrationReport {
  if (settings.timezone !== APP_TIME_ZONE) {
    throw new Error(
      `Historical Prayerapp calibration currently requires ${APP_TIME_ZONE}`,
    );
  }

  const ordered = [...existing].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const days = ordered.map((row) =>
    comparePrayerDay(row, calculatePrayerTimes(row.date, settings)),
  );
  const deltas = days.flatMap((day) =>
    PRAYER_KEYS.map((key) => Math.abs(day[key].deltaMinutes)),
  );

  return {
    startDate: ordered[0]?.date ?? null,
    endDate: ordered.at(-1)?.date ?? null,
    settingsRevision: settings.calculationRevision,
    maximumAbsoluteDeltaMinutes: deltas.length ? Math.max(...deltas) : 0,
    requiresInvestigation: days.some((day) =>
      PRAYER_KEYS.some((key) => day[key].requiresInvestigation),
    ),
    days,
  };
}
