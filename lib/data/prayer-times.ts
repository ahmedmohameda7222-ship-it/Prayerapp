import { createClient } from "@/lib/supabase/client";
import type { PrayerTime } from "@/lib/types";
import { CACHE_TTL, getCached, invalidateCache, invalidateCachePrefix } from "./cache";
import { saveToPersistentCache, loadFromPersistentCacheStale, clearPersistentCache, clearPersistentCachePrefix } from "./persistent-public-cache";

const PRAYER_STALE_FALLBACK_MS = 5 * 60_000;

function mapFromDb(row: Record<string, unknown>): PrayerTime {
  const maghribIqama = row.maghrib_iqama ? String(row.maghrib_iqama) : undefined;
  return {
    id: String(row.id),
    date: String(row.date),
    fajr: String(row.fajr),
    sunrise: String(row.sunrise),
    dhuhr: String(row.dhuhr),
    asr: String(row.asr),
    maghrib: String(row.maghrib),
    isha: String(row.isha),
    fajrIqama: row.fajr_iqama ? String(row.fajr_iqama) : undefined,
    dhuhrIqama: row.dhuhr_iqama ? String(row.dhuhr_iqama) : undefined,
    asrIqama: row.asr_iqama ? String(row.asr_iqama) : undefined,
    maghribIqama,
    ishaIqama: row.isha_iqama ? String(row.isha_iqama) : undefined,
    maghribProgram: {
      enabled: Boolean(row.maghrib_program_enabled),
      maghribIqamaTime: maghribIqama,
      lessonTitle: row.maghrib_lesson_title ? String(row.maghrib_lesson_title) : undefined,
      lessonDurationMinutes: row.maghrib_lesson_duration_minutes == null ? undefined : Number(row.maghrib_lesson_duration_minutes),
      combinedIshaTime: row.maghrib_combined_isha_time ? String(row.maghrib_combined_isha_time) : undefined,
    },
    note: row.note ? String(row.note) : undefined,
    published: Boolean(row.published),
    updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
  };
}

function mapToDb(item: Partial<PrayerTime>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (item.id) db.id = item.id;
  if (item.date) db.date = item.date;
  if (item.fajr) db.fajr = item.fajr;
  if (item.sunrise) db.sunrise = item.sunrise;
  if (item.dhuhr) db.dhuhr = item.dhuhr;
  if (item.asr) db.asr = item.asr;
  if (item.maghrib) db.maghrib = item.maghrib;
  if (item.isha) db.isha = item.isha;
  if (item.fajrIqama !== undefined) db.fajr_iqama = item.fajrIqama;
  if (item.dhuhrIqama !== undefined) db.dhuhr_iqama = item.dhuhrIqama;
  if (item.asrIqama !== undefined) db.asr_iqama = item.asrIqama;
  if (item.maghribIqama !== undefined) db.maghrib_iqama = item.maghribIqama;
  if (item.ishaIqama !== undefined) db.isha_iqama = item.ishaIqama;
  if (item.maghribProgram !== undefined) {
    db.maghrib_program_enabled = item.maghribProgram.enabled;
    db.maghrib_iqama = item.maghribProgram.maghribIqamaTime || null;
    db.maghrib_lesson_title = item.maghribProgram.lessonTitle || null;
    db.maghrib_lesson_duration_minutes = item.maghribProgram.lessonDurationMinutes ?? null;
    db.maghrib_combined_isha_time = item.maghribProgram.combinedIshaTime || null;
  }
  if (item.note !== undefined) db.note = item.note;
  if (item.published !== undefined) db.published = item.published;
  db.updated_at = new Date().toISOString();
  return db;
}

function invalidatePrayerCaches(date?: string) {
  invalidateCachePrefix("prayer_times");
  invalidateCachePrefix("prayer_time_");
  clearPersistentCachePrefix("prayer_times");
  clearPersistentCachePrefix("prayer_time_");
  if (date) {
    invalidateCache(`prayer_time_${date}`);
    clearPersistentCache(`prayer_time_${date}`);
  }
}

function selectedDate(row: unknown) {
  if (!row || typeof row !== "object") return undefined;
  const value = (row as Record<string, unknown>).date;
  return typeof value === "string" ? value : undefined;
}

export async function getPrayerTimes(
  includeUnpublished = false,
  startDate?: string,
  endDate?: string,
  limit?: number,
): Promise<PrayerTime[]> {
  const client = createClient();
  if (!client) return [];

  if (includeUnpublished) {
    let query = client
      .from("prayer_times")
      .select("*")
      .order("date", { ascending: true });
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error || !data) throw new Error("Unable to load prayer times");
    return data.map((row: unknown) => mapFromDb(row as Record<string, unknown>));
  }

  const key = `prayer_times_${startDate || "all"}_${endDate || "all"}_${limit || "all"}`;
  return getCached(key, async () => {
    try {
      let query = client
        .from("prayer_times")
        .select("*")
        .order("date", { ascending: true })
        .eq("published", true);
      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error || !data) throw new Error("Unable to load prayer times");
      const result = data.map((row: unknown) => mapFromDb(row as Record<string, unknown>));
      saveToPersistentCache(key, result, CACHE_TTL.prayerTimes, PRAYER_STALE_FALLBACK_MS);
      return result;
    } catch (error) {
      const stale = loadFromPersistentCacheStale<PrayerTime[]>(key);
      if (stale) return stale;
      throw error;
    }
  }, CACHE_TTL.prayerTimes);
}

export async function getPrayerTimeByDate(date: string): Promise<PrayerTime | undefined> {
  const client = createClient();
  if (!client) return undefined;
  const key = `prayer_time_${date}`;
  return getCached(key, async () => {
    try {
      const { data, error } = await client
        .from("prayer_times")
        .select("*")
        .eq("date", date)
        .eq("published", true)
        .single();
      if (error || !data) {
        if (error?.code === "PGRST116") return undefined;
        throw new Error("Unable to load prayer time");
      }
      const result = mapFromDb(data as Record<string, unknown>);
      saveToPersistentCache(key, result, CACHE_TTL.prayerTimes, PRAYER_STALE_FALLBACK_MS);
      return result;
    } catch (error) {
      const stale = loadFromPersistentCacheStale<PrayerTime>(key);
      if (stale) return stale;
      throw error;
    }
  }, CACHE_TTL.prayerTimes);
}

export async function createPrayerTime(item: Omit<PrayerTime, "id">): Promise<PrayerTime> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const dbItem = mapToDb(item);
  const { data, error } = await client.from("prayer_times").insert(dbItem as never).select().single();
  if (error || !data) throw new Error("Failed to create prayer time");
  invalidatePrayerCaches(item.date);
  return mapFromDb(data as Record<string, unknown>);
}

export async function updatePrayerTime(id: string, item: Partial<PrayerTime>): Promise<PrayerTime> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data: previous } = await client.from("prayer_times").select("date").eq("id", id).maybeSingle();
  const previousDate = selectedDate(previous);
  const dbItem = mapToDb(item);
  const { data, error } = await client.from("prayer_times").update(dbItem as never).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update prayer time");
  invalidatePrayerCaches(item.date || previousDate);
  if (previousDate && item.date && previousDate !== item.date) invalidatePrayerCaches(previousDate);
  return mapFromDb(data as Record<string, unknown>);
}

export async function deletePrayerTime(id: string): Promise<void> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data: previous } = await client.from("prayer_times").select("date").eq("id", id).maybeSingle();
  const previousDate = selectedDate(previous);
  const { error } = await client.from("prayer_times").delete().eq("id", id);
  if (error) throw new Error("Failed to delete prayer time");
  invalidatePrayerCaches(previousDate);
}
