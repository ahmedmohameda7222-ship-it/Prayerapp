import "server-only";
import { APP_TIME_ZONE } from "@/lib/date-utils";
import { createServerClient } from "@/lib/supabase/server";
import type { PrayerCalculationSettings } from "@/lib/prayer-engine/types";
import { validatePrayerCalculationSettings } from "@/lib/prayer-engine/validate-settings";

type PrayerSettingsRow = {
  settings: PrayerCalculationSettings;
  appliedTimezone: string;
  rowRevision: number;
  sourceUpdatedAt: string;
};

function mapFromDb(row: Record<string, unknown>): PrayerCalculationSettings {
  return validatePrayerCalculationSettings({
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    timezone: row.timezone,
    fajrAngle: Number(row.fajr_angle),
    ishaRule: row.isha_rule,
    ishaAngle: row.isha_angle == null ? null : Number(row.isha_angle),
    ishaMinutesAfterMaghrib:
      row.isha_minutes_after_maghrib == null
        ? null
        : Number(row.isha_minutes_after_maghrib),
    asrShadowFactor: Number(row.asr_shadow_factor),
    highLatitudeRule: row.high_latitude_rule,
    offsets: {
      fajr: Number(row.fajr_offset_minutes),
      sunrise: Number(row.sunrise_offset_minutes),
      dhuhr: Number(row.dhuhr_offset_minutes),
      asr: Number(row.asr_offset_minutes),
      maghrib: Number(row.maghrib_offset_minutes),
      isha: Number(row.isha_offset_minutes),
    },
    iqamaDelays: {
      fajr: Number(row.fajr_iqama_delay_minutes),
      dhuhr: Number(row.dhuhr_iqama_delay_minutes),
      asr: Number(row.asr_iqama_delay_minutes),
      maghrib: Number(row.maghrib_iqama_delay_minutes),
      isha: Number(row.isha_iqama_delay_minutes),
    },
    calculationRevision: Number(row.calculation_revision),
    appliedCalculationRevision: Number(row.applied_calculation_revision),
  });
}

function mutablePrayerSettingsValues(
  settings: PrayerCalculationSettings,
): Record<string, unknown> {
  return {
    latitude: settings.latitude,
    longitude: settings.longitude,
    timezone: settings.timezone,
    fajr_angle: settings.fajrAngle,
    isha_rule: settings.ishaRule,
    isha_angle: settings.ishaAngle,
    isha_minutes_after_maghrib: settings.ishaMinutesAfterMaghrib,
    asr_shadow_factor: settings.asrShadowFactor,
    high_latitude_rule: settings.highLatitudeRule,
    fajr_offset_minutes: settings.offsets.fajr,
    sunrise_offset_minutes: settings.offsets.sunrise,
    dhuhr_offset_minutes: settings.offsets.dhuhr,
    asr_offset_minutes: settings.offsets.asr,
    maghrib_offset_minutes: settings.offsets.maghrib,
    isha_offset_minutes: settings.offsets.isha,
    fajr_iqama_delay_minutes: settings.iqamaDelays.fajr,
    dhuhr_iqama_delay_minutes: settings.iqamaDelays.dhuhr,
    asr_iqama_delay_minutes: settings.iqamaDelays.asr,
    maghrib_iqama_delay_minutes: settings.iqamaDelays.maghrib,
    isha_iqama_delay_minutes: settings.iqamaDelays.isha,
    calculation_revision: settings.calculationRevision,
    updated_at: new Date().toISOString(),
  };
}

export function prayerSettingsInsertValues(
  settings: PrayerCalculationSettings,
): Record<string, unknown> {
  return {
    id: "1",
    ...mutablePrayerSettingsValues(settings),
    applied_calculation_revision: 0,
    // Existing canonical prayer_times rows were historically authored under
    // the application timezone. A first settings save must therefore keep a
    // different timezone pending until a full recalculation promotes it.
    applied_timezone: APP_TIME_ZONE,
  };
}

export function prayerSettingsUpdateValues(
  settings: PrayerCalculationSettings,
): Record<string, unknown> {
  return mutablePrayerSettingsValues(settings);
}

function calculationFingerprint(settings: PrayerCalculationSettings): string {
  return JSON.stringify({
    latitude: settings.latitude,
    longitude: settings.longitude,
    timezone: settings.timezone,
    fajrAngle: settings.fajrAngle,
    ishaRule: settings.ishaRule,
    ishaAngle: settings.ishaAngle,
    ishaMinutesAfterMaghrib: settings.ishaMinutesAfterMaghrib,
    asrShadowFactor: settings.asrShadowFactor,
    highLatitudeRule: settings.highLatitudeRule,
    offsets: settings.offsets,
  });
}

export function nextCalculationRevision(
  current: PrayerCalculationSettings | null,
  next: PrayerCalculationSettings,
): number {
  if (!current) return 1;
  return calculationFingerprint(current) === calculationFingerprint(next)
    ? current.calculationRevision
    : current.calculationRevision + 1;
}

async function loadPrayerSettingsRow(): Promise<PrayerSettingsRow | null> {
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");

  const { data, error } = await client
    .from("prayer_settings")
    .select("*")
    .eq("id", "1")
    .maybeSingle();

  if (error) throw new Error("Unable to load prayer settings");
  if (!data) return null;

  const record = data as Record<string, unknown>;
  const rowRevision = Number(record.row_revision);
  if (!Number.isInteger(rowRevision) || rowRevision < 1) {
    throw new Error("Invalid prayer settings row revision");
  }

  const settings = mapFromDb(record);
  const appliedTimezone = String(record.applied_timezone || "");
  if (!appliedTimezone) {
    throw new Error("Invalid applied prayer settings timezone");
  }

  return {
    settings,
    appliedTimezone,
    rowRevision,
    sourceUpdatedAt: String(record.updated_at),
  };
}

export async function getPrayerSettings(): Promise<PrayerCalculationSettings | null> {
  return (await loadPrayerSettingsRow())?.settings ?? null;
}

export async function getRuntimePrayerSettings(): Promise<PrayerCalculationSettings | null> {
  const row = await loadPrayerSettingsRow();
  if (!row) return null;
  return validatePrayerCalculationSettings({
    ...row.settings,
    timezone: row.appliedTimezone,
  });
}

export async function getPrayerSettingsForDisplay(): Promise<{
  value: PrayerCalculationSettings;
  sourceUpdatedAt: string;
} | null> {
  const row = await loadPrayerSettingsRow();
  return row ? { value: row.settings, sourceUpdatedAt: row.sourceUpdatedAt } : null;
}

export async function getRuntimePrayerSettingsForDisplay(): Promise<{
  value: PrayerCalculationSettings;
  sourceUpdatedAt: string;
} | null> {
  const row = await loadPrayerSettingsRow();
  if (!row) return null;
  return {
    value: validatePrayerCalculationSettings({
      ...row.settings,
      timezone: row.appliedTimezone,
    }),
    sourceUpdatedAt: row.sourceUpdatedAt,
  };
}

export async function savePrayerSettings(
  next: PrayerCalculationSettings,
): Promise<PrayerCalculationSettings> {
  const validated = validatePrayerCalculationSettings(next);
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");

  const currentRow = await loadPrayerSettingsRow();
  const current = currentRow?.settings ?? null;
  const stored: PrayerCalculationSettings = {
    ...validated,
    calculationRevision: nextCalculationRevision(current, validated),
    appliedCalculationRevision: current?.appliedCalculationRevision ?? 0,
  };

  if (!currentRow) {
    const { data, error } = await client
      .from("prayer_settings")
      .insert(prayerSettingsInsertValues(stored) as never)
      .select()
      .single();
    if (error || !data) throw new Error("Unable to create prayer settings");
    return mapFromDb(data as Record<string, unknown>);
  }

  const { data, error } = await client
    .from("prayer_settings")
    .update({
      ...prayerSettingsUpdateValues(stored),
      row_revision: currentRow.rowRevision + 1,
    } as never)
    .eq("id", "1")
    .eq("row_revision", currentRow.rowRevision)
    .select()
    .maybeSingle();

  if (error) throw new Error("Unable to save prayer settings");
  if (!data) throw new Error("Prayer settings changed concurrently; reload and retry");
  return mapFromDb(data as Record<string, unknown>);
}
