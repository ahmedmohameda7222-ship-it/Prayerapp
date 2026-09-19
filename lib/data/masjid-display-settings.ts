import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import type { MasjidDisplaySettings } from "@/lib/types";

interface MasjidDisplaySettingsRow {
  fajr_prayer_duration_minutes: number;
  dhuhr_prayer_duration_minutes: number;
  asr_prayer_duration_minutes: number;
  maghrib_prayer_duration_minutes: number;
  isha_prayer_duration_minutes: number;
  azkar_playlist_ids: string[] | null;
  updated_at: string;
}

export function mapMasjidDisplaySettingsRow(row: MasjidDisplaySettingsRow): MasjidDisplaySettings {
  return {
    fajrPrayerDurationMinutes: Number(row.fajr_prayer_duration_minutes),
    dhuhrPrayerDurationMinutes: Number(row.dhuhr_prayer_duration_minutes),
    asrPrayerDurationMinutes: Number(row.asr_prayer_duration_minutes),
    maghribPrayerDurationMinutes: Number(row.maghrib_prayer_duration_minutes),
    ishaPrayerDurationMinutes: Number(row.isha_prayer_duration_minutes),
    azkarPlaylistIds: Array.isArray(row.azkar_playlist_ids) ? row.azkar_playlist_ids.map(String) : [],
  };
}

function toDb(settings: MasjidDisplaySettings) {
  return {
    id: "1",
    fajr_prayer_duration_minutes: settings.fajrPrayerDurationMinutes,
    dhuhr_prayer_duration_minutes: settings.dhuhrPrayerDurationMinutes,
    asr_prayer_duration_minutes: settings.asrPrayerDurationMinutes,
    maghrib_prayer_duration_minutes: settings.maghribPrayerDurationMinutes,
    isha_prayer_duration_minutes: settings.ishaPrayerDurationMinutes,
    azkar_playlist_ids: settings.azkarPlaylistIds,
    updated_at: new Date().toISOString(),
  };
}

export async function getMasjidDisplaySettings(): Promise<MasjidDisplaySettings | null> {
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("masjid_display_settings").select("*").eq("id", "1").maybeSingle();
  if (error) throw new Error("Unable to load Masjid Display settings");
  return data ? mapMasjidDisplaySettingsRow(data as unknown as MasjidDisplaySettingsRow) : null;
}

export async function getMasjidDisplaySettingsForDisplay(): Promise<{
  value: MasjidDisplaySettings;
  sourceUpdatedAt: string;
} | null> {
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("masjid_display_settings").select("*").eq("id", "1").maybeSingle();
  if (error) throw new Error("Unable to load Masjid Display settings");
  if (!data) return null;
  const row = data as unknown as MasjidDisplaySettingsRow;
  return {
    value: mapMasjidDisplaySettingsRow(row),
    sourceUpdatedAt: String(row.updated_at),
  };
}

export async function saveMasjidDisplaySettings(settings: MasjidDisplaySettings): Promise<MasjidDisplaySettings> {
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("masjid_display_settings").upsert(toDb(settings), { onConflict: "id" }).select().single();
  if (error || !data) throw new Error("Unable to save Masjid Display settings");
  return mapMasjidDisplaySettingsRow(data as unknown as MasjidDisplaySettingsRow);
}
