import "server-only";
import { getPrayerSettings } from "@/lib/data/prayer-settings";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { invalidateCachePrefix } from "@/lib/data/cache";
import { clearPersistentCachePrefix } from "@/lib/data/persistent-public-cache";
import { todayIso } from "@/lib/date-utils";
import { createServerClient } from "@/lib/supabase/server";
import type { PrayerTime } from "@/lib/types";
import { calibrateSchedule, type CalibrationReport } from "./calibration";
import {
  addIsoDays,
  buildExtensionPreview,
  buildRecalculationPreview,
  oneCalendarYearEnd,
  type PrayerScheduleDiff,
  type PrayerSchedulePreview,
} from "./generate";
import type {
  PrayerCalculationResult,
  PrayerCalculationSettings,
} from "./types";

interface RpcResult {
  data: unknown;
  error: { message?: string } | null;
}

export interface PrayerEngineServerDependencies {
  getSettings: () => Promise<PrayerCalculationSettings | null>;
  getPrayerTimes: (
    includeUnpublished?: boolean,
    startDate?: string,
    endDate?: string,
    limit?: number,
  ) => Promise<PrayerTime[]>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
  invalidatePrayerCaches: () => void;
  today: () => string;
}

function invalidatePrayerCaches(): void {
  invalidateCachePrefix("prayer_times");
  invalidateCachePrefix("prayer_time_");
  clearPersistentCachePrefix("prayer_times");
  clearPersistentCachePrefix("prayer_time_");
}

function defaultDependencies(): PrayerEngineServerDependencies {
  return {
    getSettings: getPrayerSettings,
    getPrayerTimes,
    rpc: async (name, args) => {
      const client = createServerClient();
      if (!client) throw new Error("Supabase is not configured");
      const { data, error } = await client.rpc(name, args);
      return {
        data,
        error: error ? { message: error.message } : null,
      };
    },
    invalidatePrayerCaches,
    today: todayIso,
  };
}

function requireSettings(
  settings: PrayerCalculationSettings | null,
): PrayerCalculationSettings {
  if (!settings) throw new Error("Prayer calculation settings are not configured");
  return settings;
}

function toCalculationRow(row: PrayerTime): PrayerCalculationResult {
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

function previewRowsEqual(
  left: PrayerSchedulePreview,
  right: PrayerSchedulePreview,
): boolean {
  return (
    left.startDate === right.startDate &&
    left.endDate === right.endDate &&
    left.expectedFirstMissing === right.expectedFirstMissing &&
    left.settingsRevision === right.settingsRevision &&
    JSON.stringify(left.rows) === JSON.stringify(right.rows)
  );
}

function diffRowsEqual(left: PrayerScheduleDiff, right: PrayerScheduleDiff): boolean {
  return (
    left.startDate === right.startDate &&
    left.endDate === right.endDate &&
    left.settingsRevision === right.settingsRevision &&
    JSON.stringify(left.rows.map((row) => row.next)) ===
      JSON.stringify(right.rows.map((row) => row.next))
  );
}

function affectedCount(value: unknown): number {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) {
    throw new Error("Invalid prayer schedule commit response");
  }
  return result;
}

async function loadPrayerTimesRange(
  startDate: string,
  endDate: string,
  dependencies: PrayerEngineServerDependencies,
): Promise<PrayerTime[]> {
  if (endDate < startDate) return [];

  const rows: PrayerTime[] = [];
  for (let cursor = startDate; cursor <= endDate; ) {
    const fullChunkEnd = addIsoDays(cursor, 365);
    const chunkEnd = fullChunkEnd < endDate ? fullChunkEnd : endDate;
    rows.push(
      ...(await dependencies.getPrayerTimes(
        true,
        cursor,
        chunkEnd,
        400,
      )),
    );
    cursor = addIsoDays(chunkEnd, 1);
  }
  return rows;
}

async function loadExtensionBasisDates(
  today: string,
  dependencies: PrayerEngineServerDependencies,
): Promise<string[]> {
  const dates = new Set<string>();
  let cursor = today;

  // Match the database race check's bounded future search while keeping each
  // PostgREST request below the existing 400-row data-layer default.
  for (let window = 0; window < 10; window++) {
    const windowEnd = addIsoDays(cursor, 365);
    const rows = await loadPrayerTimesRange(cursor, windowEnd, dependencies);
    rows.forEach((row) => dates.add(row.date));

    let firstMissing = cursor;
    while (firstMissing <= windowEnd && dates.has(firstMissing)) {
      firstMissing = addIsoDays(firstMissing, 1);
    }

    if (firstMissing <= windowEnd) {
      const horizonEnd = oneCalendarYearEnd(firstMissing);
      if (windowEnd < horizonEnd) {
        const remaining = await loadPrayerTimesRange(
          addIsoDays(windowEnd, 1),
          horizonEnd,
          dependencies,
        );
        remaining.forEach((row) => dates.add(row.date));
      }
      return [...dates];
    }

    cursor = addIsoDays(windowEnd, 1);
  }

  throw new Error("No missing prayer schedule date found within ten years");
}

export async function previewScheduleExtension(
  today = todayIso(),
  dependencies: PrayerEngineServerDependencies = defaultDependencies(),
): Promise<PrayerSchedulePreview> {
  const settings = requireSettings(await dependencies.getSettings());
  if (settings.calculationRevision !== settings.appliedCalculationRevision) {
    throw new Error("Recalculate the future schedule before extending it");
  }

  const existingDates = await loadExtensionBasisDates(today, dependencies);
  return buildExtensionPreview(existingDates, today, settings);
}

export async function commitScheduleExtension(
  preview: PrayerSchedulePreview,
  dependencies: PrayerEngineServerDependencies = defaultDependencies(),
): Promise<number> {
  const today = dependencies.today();
  const settings = requireSettings(await dependencies.getSettings());
  if (
    settings.calculationRevision !== preview.settingsRevision ||
    settings.appliedCalculationRevision !== preview.settingsRevision
  ) {
    throw new Error("Prayer calculation revision changed; preview again");
  }

  const existingDates = await loadExtensionBasisDates(today, dependencies);
  const fresh = buildExtensionPreview(existingDates, today, settings);
  if (!previewRowsEqual(preview, fresh)) {
    throw new Error("Prayer schedule changed; preview again");
  }

  const { data, error } = await dependencies.rpc(
    "commit_prayer_schedule_extension",
    {
      p_rows: preview.rows,
      p_expected_revision: preview.settingsRevision,
      p_today: today,
      p_expected_first_missing: preview.expectedFirstMissing,
    },
  );
  if (error) throw new Error(error.message || "Unable to extend prayer schedule");

  const count = affectedCount(data);
  dependencies.invalidatePrayerCaches();
  return count;
}

export async function previewFutureRecalculation(
  startDate: string,
  endDate: string,
  dependencies: PrayerEngineServerDependencies = defaultDependencies(),
): Promise<PrayerScheduleDiff> {
  if (startDate < dependencies.today()) {
    throw new Error("Future recalculation cannot start before mosque-local today");
  }
  const settings = requireSettings(await dependencies.getSettings());
  const existing = await loadPrayerTimesRange(startDate, endDate, dependencies);
  return buildRecalculationPreview(
    existing.map(toCalculationRow),
    startDate,
    endDate,
    settings,
  );
}

export async function commitFutureRecalculation(
  preview: PrayerScheduleDiff,
  dependencies: PrayerEngineServerDependencies = defaultDependencies(),
): Promise<number> {
  const today = dependencies.today();
  if (preview.startDate < today) {
    throw new Error("Future recalculation cannot change past dates");
  }

  const settings = requireSettings(await dependencies.getSettings());
  if (settings.calculationRevision !== preview.settingsRevision) {
    throw new Error("Prayer calculation revision changed; preview again");
  }

  const existing = await loadPrayerTimesRange(
    preview.startDate,
    preview.endDate,
    dependencies,
  );
  const fresh = buildRecalculationPreview(
    existing.map(toCalculationRow),
    preview.startDate,
    preview.endDate,
    settings,
  );
  if (!diffRowsEqual(preview, fresh)) {
    throw new Error("Prayer schedule changed; preview again");
  }

  const { data, error } = await dependencies.rpc(
    "commit_prayer_schedule_recalculation",
    {
      p_rows: preview.rows.map((row) => row.next),
      p_expected_revision: preview.settingsRevision,
      p_today: today,
      p_start_date: preview.startDate,
      p_end_date: preview.endDate,
    },
  );
  if (error) {
    throw new Error(error.message || "Unable to recalculate prayer schedule");
  }

  const count = affectedCount(data);
  dependencies.invalidatePrayerCaches();
  return count;
}

export async function calibrateAgainstHistoricalSchedule(
  startDate: string,
  endDate: string,
  dependencies: PrayerEngineServerDependencies = defaultDependencies(),
): Promise<CalibrationReport> {
  const settings = requireSettings(await dependencies.getSettings());
  const existing = await loadPrayerTimesRange(startDate, endDate, dependencies);
  return calibrateSchedule(existing.map(toCalculationRow), settings);
}
