import { createClient } from "@/lib/supabase/client";
import type { JumuahTime } from "@/lib/types";
import { previewJumuahTimes } from "./demo-data";
import { localizedFieldsFromDb, localizedFieldsToDb, readDbString } from "./localized-db";
import { CACHE_TTL, getCached, invalidateCachePrefix } from "./cache";
import { saveToPersistentCache, loadFromPersistentCacheStale, clearPersistentCachePrefix } from "./persistent-public-cache";

function filterPreviewJumuahTimes(includeUnpublished = false): JumuahTime[] {
  return previewJumuahTimes.filter((item) => includeUnpublished || item.published);
}

function mapFromDb(row: Record<string, unknown>): JumuahTime {
  return {
    id: String(row.id),
    date: String(row.date),
    khutbahTime: String(row.khutbah_time),
    prayerTime: String(row.prayer_time),
    locationName: row.location_name ? String(row.location_name) : undefined,
    locationAddress: row.location_address ? String(row.location_address) : undefined,
    khateebName: row.khateeb_name ? String(row.khateeb_name) : undefined,
    language: readDbString(row, "language"),
    notes: readDbString(row, "notes"),
    ...localizedFieldsFromDb(row, "language", "language"),
    ...localizedFieldsFromDb(row, "notes", "notes"),
    published: Boolean(row.published),
  };
}

function mapToDb(item: Partial<JumuahTime>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (item.id) db.id = item.id;
  if (item.date) db.date = item.date;
  if (item.khutbahTime) db.khutbah_time = item.khutbahTime;
  if (item.prayerTime) db.prayer_time = item.prayerTime;
  db.location_name = item.locationName || null;
  db.location_address = item.locationAddress || null;
  db.khateeb_name = item.khateebName || null;
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "language", "language", { includeLegacy: true }));
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "notes", "notes", { includeLegacy: true }));
  if (item.language) db.language = item.languageAr || item.language;
  if (item.notes !== undefined) db.notes = item.notesAr || item.notes;
  if (item.published !== undefined) db.published = item.published;
  return db;
}

export async function getJumuahTimes(includeUnpublished = false): Promise<JumuahTime[]> {
  const client = createClient();
  if (!client) return filterPreviewJumuahTimes(includeUnpublished);
  if (includeUnpublished) {
    let query = client
      .from("jumuah_times")
      .select("*")
      .order("date", { ascending: true });
    const { data, error } = await query;
    if (error || !data) throw new Error("Unable to load Jumu'ah times");
    return data.map((row: unknown) => mapFromDb(row as Record<string, unknown>));
  }
  const key = `jumuah_times_public`;
  return getCached(key, async () => {
    try {
      let query = client
        .from("jumuah_times")
        .select("*")
        .order("date", { ascending: true })
        .eq("published", true);
      const { data, error } = await query;
      if (error || !data) throw new Error("Unable to load Jumu'ah times");
      const result = data.map((row: unknown) => mapFromDb(row as Record<string, unknown>));
      saveToPersistentCache(key, result, CACHE_TTL.jumuah, 3 * 24 * 60 * 60 * 1000);
      return result;
    } catch (error) {
      const stale = loadFromPersistentCacheStale<JumuahTime[]>(key);
      if (stale) return stale;
      throw error;
    }
  }, CACHE_TTL.jumuah);
}

export async function createJumuahTime(item: Omit<JumuahTime, "id">): Promise<JumuahTime> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("jumuah_times").insert(mapToDb(item) as never).select().single();
  if (error || !data) throw new Error("Failed to create Jumu'ah time");
  invalidateCachePrefix("jumuah_times");
  clearPersistentCachePrefix("jumuah_times");
  return mapFromDb(data as Record<string, unknown>);
}

export async function updateJumuahTime(id: string, item: Partial<JumuahTime>): Promise<JumuahTime> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("jumuah_times").update(mapToDb(item) as never).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update Jumu'ah time");
  invalidateCachePrefix("jumuah_times");
  clearPersistentCachePrefix("jumuah_times");
  return mapFromDb(data as Record<string, unknown>);
}

export async function deleteJumuahTime(id: string): Promise<void> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { error } = await client.from("jumuah_times").delete().eq("id", id);
  if (error) throw new Error("Failed to delete Jumu'ah time");
  invalidateCachePrefix("jumuah_times");
  clearPersistentCachePrefix("jumuah_times");
}
