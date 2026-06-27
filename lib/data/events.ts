import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/types";
import { localizedFieldsFromDb, localizedFieldsToDb, readDbString } from "./localized-db";
import { getCached, invalidateCache, invalidateCachePrefix } from "./cache";

export async function getEvents(includeUnpublished = false): Promise<Event[]> {
  const client = createClient();
  if (!client) return [];
  const key = `events_${includeUnpublished}`;
  return getCached(key, async () => {
    let query = client.from("events").select("*").order("date", { ascending: true });
    if (!includeUnpublished) query = query.eq("published", true);
    const { data, error } = await query;
    if (error || !data) throw new Error("Unable to load events");
    return data.map((row: unknown) => {
      const record = row as Record<string, unknown>;
      return {
        id: String(record.id),
        title: readDbString(record, "title"),
        description: readDbString(record, "description"),
        date: String(record.date),
        startTime: String(record.start_time),
        endTime: String(record.end_time || ""),
        location: readDbString(record, "location"),
        type: String(record.type),
        published: record.published !== false,
        ...localizedFieldsFromDb(record, "title", "title"),
        ...localizedFieldsFromDb(record, "description", "description"),
        ...localizedFieldsFromDb(record, "location", "location"),
      };
    });
  });
}

export async function createEvent(item: Omit<Event, "id">): Promise<Event> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const db = {
    ...localizedFieldsToDb(item as unknown as Record<string, unknown>, "title", "title", { includeLegacy: true }),
    ...localizedFieldsToDb(item as unknown as Record<string, unknown>, "description", "description", { includeLegacy: true }),
    ...localizedFieldsToDb(item as unknown as Record<string, unknown>, "location", "location", { includeLegacy: true }),
    title: item.titleAr || item.title,
    description: item.descriptionAr || item.description,
    date: item.date,
    start_time: item.startTime,
    end_time: item.endTime,
    location: item.locationAr || item.location,
    type: item.type,
  };
  const { data, error } = await client.from("events").insert(db as never).select().single();
  if (error || !data) throw new Error("Failed to create event");
  invalidateCachePrefix("events");
  return { ...item, id: String((data as Record<string, unknown>).id) };
}

export async function updateEvent(id: string, item: Partial<Event>): Promise<Event> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const db: Record<string, unknown> = {};
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "title", "title", { includeLegacy: true }));
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "description", "description", { includeLegacy: true }));
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "location", "location", { includeLegacy: true }));
  if (item.title) db.title = item.titleAr || item.title;
  if (item.description) db.description = item.descriptionAr || item.description;
  if (item.date) db.date = item.date;
  if (item.startTime) db.start_time = item.startTime;
  if (item.endTime) db.end_time = item.endTime;
  if (item.location) db.location = item.locationAr || item.location;
  if (item.type) db.type = item.type;
  const { data, error } = await client.from("events").update(db as never).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update event");
  invalidateCachePrefix("events");
  return { ...item, id: String((data as Record<string, unknown>).id) } as Event;
}

export async function deleteEvent(id: string): Promise<void> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { error } = await client.from("events").delete().eq("id", id);
  if (error) throw new Error("Failed to delete event");
  invalidateCachePrefix("events");
}
