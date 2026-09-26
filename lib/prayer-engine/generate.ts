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

export interface PrayerSchedulePreview {
  startDate: string;
  endDate: string;
  expectedFirstMissing: string;
  settingsRevision: number;
  rows: PrayerCalculationResult[];
}

export interface PrayerScheduleDiffRow {
  date: string;
  previous: PrayerCalculationResult | null;
  next: PrayerCalculationResult;
  changedPrayers: PrayerKey[];
}

export interface PrayerScheduleDiff {
  startDate: string;
  endDate: string;
  settingsRevision: number;
  changedRowCount: number;
  changedPrayerCount: number;
  rows: PrayerScheduleDiffRow[];
}

function parseIsoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return result;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addIsoDays(value: string, days: number): string {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

export function oneCalendarYearEnd(startDate: string): string {
  const start = parseIsoDate(startDate);
  const anniversary = new Date(
    Date.UTC(
      start.getUTCFullYear() + 1,
      start.getUTCMonth(),
      start.getUTCDate(),
    ),
  );
  anniversary.setUTCDate(anniversary.getUTCDate() - 1);
  return isoDate(anniversary);
}

function normalizeRow(row: PrayerCalculationResult): PrayerCalculationResult {
  return {
    date: row.date,
    fajr: row.fajr,
    sunrise: row.sunrise,
    dhuhr: row.dhuhr,
    asr: row.asr,
    maghrib: row.maghrib,
    isha: row.isha,
  };
}

export function buildExtensionPreview(
  existingDates: string[],
  today: string,
  settings: PrayerCalculationSettings,
): PrayerSchedulePreview {
  parseIsoDate(today);
  const existing = new Set(existingDates.map((date) => isoDate(parseIsoDate(date))));

  let firstMissing = today;
  while (existing.has(firstMissing)) {
    firstMissing = addIsoDays(firstMissing, 1);
  }

  const endDate = oneCalendarYearEnd(firstMissing);
  const rows: PrayerCalculationResult[] = [];
  for (let date = firstMissing; date <= endDate; date = addIsoDays(date, 1)) {
    if (!existing.has(date)) rows.push(calculatePrayerTimes(date, settings));
  }

  return {
    startDate: firstMissing,
    endDate,
    expectedFirstMissing: firstMissing,
    settingsRevision: settings.calculationRevision,
    rows,
  };
}

export function buildRecalculationPreview(
  existing: PrayerCalculationResult[],
  startDate: string,
  endDate: string,
  settings: PrayerCalculationSettings,
): PrayerScheduleDiff {
  parseIsoDate(startDate);
  parseIsoDate(endDate);
  if (endDate < startDate) throw new Error("Invalid recalculation range");

  const byDate = new Map(existing.map((row) => [row.date, normalizeRow(row)]));
  const rows: PrayerScheduleDiffRow[] = [];
  let changedPrayerCount = 0;

  for (let date = startDate; date <= endDate; date = addIsoDays(date, 1)) {
    const previous = byDate.get(date) ?? null;
    const next = calculatePrayerTimes(date, settings);
    const changedPrayers = PRAYER_KEYS.filter(
      (key) => previous === null || previous[key] !== next[key],
    );
    changedPrayerCount += changedPrayers.length;
    rows.push({ date, previous, next, changedPrayers });
  }

  return {
    startDate,
    endDate,
    settingsRevision: settings.calculationRevision,
    changedRowCount: rows.filter((row) => row.changedPrayers.length > 0).length,
    changedPrayerCount,
    rows,
  };
}
