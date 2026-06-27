import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/types";
import { previewAnnouncements } from "./demo-data";
import { localizedFieldsFromDb, localizedFieldsToDb, readDbString } from "./localized-db";
import { getCached, invalidateCache, invalidateCachePrefix } from "./cache";

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
  const key = `announcements_${includeUnpublished}`;
  return getCached(key, async () => {
    let query = client
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (!includeUnpublished) query = query.eq("published", true);
    const { data, error } = await query;
    if (error || !data) throw new Error("Unable to load announcements");
    return data.map((row: unknown) => mapFromDb(row as Record<string, unknown>));
  });
}

export async function createAnnouncement(item: Omit<Announcement, "id" | "createdAt">): Promise<Announcement> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("announcements").insert(mapToDb(item) as never).select().single();
  if (error || !data) throw new Error("Failed to create announcement");
  invalidateCachePrefix("announcements");
  return mapFromDb(data as Record<string, unknown>);
}

export async function updateAnnouncement(id: string, item: Partial<Announcement>): Promise<Announcement> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("announcements").update(mapToDb(item) as never).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update announcement");
  invalidateCachePrefix("announcements");
  return mapFromDb(data as Record<string, unknown>);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { error } = await client.from("announcements").delete().eq("id", id);
  if (error) throw new Error("Failed to delete announcement");
  invalidateCachePrefix("announcements");
}
