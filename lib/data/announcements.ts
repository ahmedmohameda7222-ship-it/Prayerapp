import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/types";
import { previewAnnouncements } from "./demo-data";
import { localizedFieldsFromDb, localizedFieldsToDb, readDbString } from "./localized-db";
import { CACHE_TTL, getCached, invalidateCachePrefix } from "./cache";
import { saveToPersistentCache, loadFromPersistentCacheStale, clearPersistentCachePrefix } from "./persistent-public-cache";

function filterPreviewAnnouncements(includeUnpublished = false): Announcement[] {
  return previewAnnouncements.filter((item) => includeUnpublished || item.published);
}

function mapFromDb(row: Record<string, unknown>): Announcement {
  return {
    id: String(row.id),
    title: readDbString(row, "title"),
    message: readDbString(row, "message"),
    ...localizedFieldsFromDb(row, "title", "title"),
    ...localizedFieldsFromDb(row, "message", "message"),
    type: String(row.type) as Announcement["type"],
    isUrgent: Boolean(row.is_urgent),
    published: Boolean(row.published),
    createdAt: String(row.created_at),
  };
}

function mapToDb(item: Partial<Announcement>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (item.id) db.id = item.id;
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "title", "title", { includeLegacy: true }));
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "message", "message", { includeLegacy: true }));
  if (!db.title && item.title) db.title = item.title;
  if (!db.message && item.message) db.message = item.message;
  if (item.type) db.type = item.type;
  if (item.isUrgent !== undefined) db.is_urgent = item.isUrgent;
  if (item.published !== undefined) db.published = item.published;
  db.created_at = new Date().toISOString();
  return db;
}

export async function getAnnouncements(includeUnpublished = false): Promise<Announcement[]> {
  const client = createClient();
  if (!client) return filterPreviewAnnouncements(includeUnpublished);
  if (includeUnpublished) {
    const query = client
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error || !data) throw new Error("Unable to load announcements");
    return data.map((row: unknown) => mapFromDb(row as Record<string, unknown>));
  }
  const key = `announcements_public`;
  return getCached(key, async () => {
    try {
      const query = client
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .eq("published", true);
      const { data, error } = await query;
      if (error || !data) throw new Error("Unable to load announcements");
      const result = data.map((row: unknown) => mapFromDb(row as Record<string, unknown>));
      saveToPersistentCache(key, result, CACHE_TTL.announcements, 24 * 60 * 60 * 1000);
      return result;
    } catch (error) {
      const stale = loadFromPersistentCacheStale<Announcement[]>(key);
      if (stale) return stale;
      throw error;
    }
  }, CACHE_TTL.announcements);
}

export async function getUrgentAnnouncements(): Promise<Announcement[]> {
  const client = createClient();
  if (!client) return filterPreviewAnnouncements().filter((a) => a.isUrgent);
  const key = `announcements_urgent`;
  return getCached(key, async () => {
    try {
      const { data, error } = await client
        .from("announcements")
        .select("*")
        .eq("published", true)
        .eq("is_urgent", true)
        .order("created_at", { ascending: false });
      if (error || !data) throw new Error("Unable to load urgent announcements");
      const result = data.map((row: unknown) => mapFromDb(row as Record<string, unknown>));
      saveToPersistentCache(key, result, CACHE_TTL.urgentAnnouncements, 24 * 60 * 60 * 1000);
      return result;
    } catch (error) {
      const stale = loadFromPersistentCacheStale<Announcement[]>(key);
      if (stale) return stale;
      throw error;
    }
  }, CACHE_TTL.urgentAnnouncements);
}

export async function createAnnouncement(item: Omit<Announcement, "id" | "createdAt">): Promise<Announcement> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("announcements").insert(mapToDb(item) as never).select().single();
  if (error || !data) throw new Error("Failed to create announcement");
  invalidateCachePrefix("announcements");
  clearPersistentCachePrefix("announcements");
  return mapFromDb(data as Record<string, unknown>);
}

export async function updateAnnouncement(id: string, item: Partial<Announcement>): Promise<Announcement> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("announcements").update(mapToDb(item) as never).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update announcement");
  invalidateCachePrefix("announcements");
  clearPersistentCachePrefix("announcements");
  return mapFromDb(data as Record<string, unknown>);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { error } = await client.from("announcements").delete().eq("id", id);
  if (error) throw new Error("Failed to delete announcement");
  invalidateCachePrefix("announcements");
  clearPersistentCachePrefix("announcements");
}
