"use server";

import { revalidatePath } from "next/cache";
import { requireAllowedAdminIdentity } from "@/lib/auth/admin-server";
import { getAzkarItems } from "@/lib/data/azkar";
import { createServerClient } from "@/lib/supabase/server";
import type { MasjidDisplaySettings } from "@/lib/types";
import { adminActionError, beginAdminAudit, completeAdminAudit } from "@/lib/security/admin-audit";

export type MasjidDisplaySettingsActionResult = {
  success: boolean;
  data?: MasjidDisplaySettings;
  error?: string;
};

const DEFAULT_SETTINGS: MasjidDisplaySettings = {
  fajrPrayerDurationMinutes: 10,
  dhuhrPrayerDurationMinutes: 10,
  asrPrayerDurationMinutes: 10,
  maghribPrayerDurationMinutes: 10,
  ishaPrayerDurationMinutes: 10,
  azkarPlaylistIds: [],
};

function mapSettings(row: Record<string, unknown>): MasjidDisplaySettings {
  return {
    fajrPrayerDurationMinutes: Number(row.fajr_prayer_duration_minutes),
    dhuhrPrayerDurationMinutes: Number(row.dhuhr_prayer_duration_minutes),
    asrPrayerDurationMinutes: Number(row.asr_prayer_duration_minutes),
    maghribPrayerDurationMinutes: Number(row.maghrib_prayer_duration_minutes),
    ishaPrayerDurationMinutes: Number(row.isha_prayer_duration_minutes),
    azkarPlaylistIds: Array.isArray(row.azkar_playlist_ids) ? row.azkar_playlist_ids.map(String) : [],
  };
}

function validateDuration(value: unknown, field: string): number {
  const duration = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(duration) || duration < 2 || duration > 120) {
    throw new Error(`${field} must be an integer between 2 and 120 minutes`);
  }
  return duration;
}

async function validateSettings(input: unknown): Promise<MasjidDisplaySettings> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid Masjid Display settings");
  const candidate = input as Record<string, unknown>;
  const playlist = Array.isArray(candidate.azkarPlaylistIds) ? candidate.azkarPlaylistIds.map(String) : [];
  const validIds = new Set((await getAzkarItems(true)).map((item) => item.id));
  for (const id of playlist) {
    if (!validIds.has(id)) throw new Error(`Unknown Azkar playlist ID: ${id}`);
  }
  return {
    fajrPrayerDurationMinutes: validateDuration(candidate.fajrPrayerDurationMinutes, "Fajr prayer duration"),
    dhuhrPrayerDurationMinutes: validateDuration(candidate.dhuhrPrayerDurationMinutes, "Dhuhr prayer duration"),
    asrPrayerDurationMinutes: validateDuration(candidate.asrPrayerDurationMinutes, "Asr prayer duration"),
    maghribPrayerDurationMinutes: validateDuration(candidate.maghribPrayerDurationMinutes, "Maghrib prayer duration"),
    ishaPrayerDurationMinutes: validateDuration(candidate.ishaPrayerDurationMinutes, "Isha prayer duration"),
    azkarPlaylistIds: [...new Set(playlist)],
  };
}

export async function loadMasjidDisplaySettingsAction(token: string): Promise<MasjidDisplaySettingsActionResult> {
  try {
    await requireAllowedAdminIdentity(token);
    const client = createServerClient();
    const { data, error } = await client.from("masjid_display_settings").select("*").eq("id", "1").maybeSingle();
    if (error) throw error;
    return { success: true, data: data ? mapSettings(data as Record<string, unknown>) : DEFAULT_SETTINGS };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Unable to load Masjid Display settings") };
  }
}

export async function saveMasjidDisplaySettingsAction(
  token: string,
  input: unknown,
): Promise<MasjidDisplaySettingsActionResult> {
  let audit;
  try {
    audit = await beginAdminAudit(token, {
      action: "masjid_display.settings.update",
      entityType: "masjid_display_settings",
      entityId: "1",
    });
  } catch (error) {
    return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") };
  }

  let result: MasjidDisplaySettingsActionResult;
  try {
    const settings = await validateSettings(input);
    const client = createServerClient();
    const { data, error } = await client.from("masjid_display_settings").upsert({
      id: "1",
      fajr_prayer_duration_minutes: settings.fajrPrayerDurationMinutes,
      dhuhr_prayer_duration_minutes: settings.dhuhrPrayerDurationMinutes,
      asr_prayer_duration_minutes: settings.asrPrayerDurationMinutes,
      maghrib_prayer_duration_minutes: settings.maghribPrayerDurationMinutes,
      isha_prayer_duration_minutes: settings.ishaPrayerDurationMinutes,
      azkar_playlist_ids: settings.azkarPlaylistIds,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" }).select("*").single();
    if (error) throw error;
    revalidatePath("/admin/masjid-display");
    result = { success: true, data: mapSettings(data as Record<string, unknown>) };
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : "Invalid Masjid Display settings" };
  }
  return completeAdminAudit(audit, result);
}
