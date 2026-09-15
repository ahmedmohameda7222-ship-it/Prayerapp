import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import type { PrayerCalculationSettings } from "@/lib/prayer-engine/types";
import { validatePrayerCalculationSettings } from "@/lib/prayer-engine/validate-settings";

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

function mapToDb(settings: PrayerCalculationSettings): Record<string, unknown> {
  return {
    id: "1",
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
    applied_calculation_revision: settings.appliedCalculationRevision,
    updated_at: new Date().toISOString(),
  };
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

export async function getPrayerSettings(): Promise<PrayerCalculationSettings | null> {
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");

  const { data, error } = await client
    .from("prayer_settings")
    .select("*")
    .eq("id", "1")
    .maybeSingle();

  if (error) throw new Error("Unable to load prayer settings");
  return data ? mapFromDb(data as Record<string, unknown>) : null;
}

export async function savePrayerSettings(
  next: PrayerCalculationSettings,
): Promise<PrayerCalculationSettings> {
  const validated = validatePrayerCalculationSettings(next);
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");

  const current = await getPrayerSettings();
  const stored: PrayerCalculationSettings = {
    ...validated,
    calculationRevision: nextCalculationRevision(current, validated),
    appliedCalculationRevision: current?.appliedCalculationRevision ?? 0,
  };
  const dbRow = mapToDb(stored);

  if (!current) {
    const { data, error } = await client
      .from("prayer_settings")
      .insert(dbRow as never)
      .select()
      .single();
    if (error || !data) throw new Error("Unable to create prayer settings");
    return mapFromDb(data as Record<string, unknown>);
  }

  const { data, error } = await client
    .from("prayer_settings")
    .update(dbRow as never)
    .eq("id", "1")
    .eq("calculation_revision", current.calculationRevision)
    .select()
    .maybeSingle();

  if (error) throw new Error("Unable to save prayer settings");
  if (!data) throw new Error("Prayer settings changed concurrently; reload and retry");
  return mapFromDb(data as Record<string, unknown>);
}
