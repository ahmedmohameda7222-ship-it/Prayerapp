import { createClient } from "@/lib/supabase/client";
import { jumuahTimes as mockJumuahTimes } from "@/lib/mock-data";
import type { JumuahTime } from "@/lib/types";
import { localizedFieldsFromDb, localizedFieldsToDb, readDbString } from "./localized-db";

function mapFromDb(row: Record<string, unknown>): JumuahTime {
  return {
    id: String(row.id),
    date: String(row.date),
    khutbahTime: String(row.khutbah_time),
    prayerTime: String(row.prayer_time),
    locationName: String(row.location_name),
    locationAddress: String(row.location_address),
    khateebName: String(row.khateeb_name),
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
  if (item.locationName) db.location_name = item.locationName;
  if (item.locationAddress) db.location_address = item.locationAddress;
  if (item.khateebName) db.khateeb_name = item.khateebName;
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "language", "language", { includeLegacy: true }));
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "notes", "notes", { includeLegacy: true }));
  if (item.language) db.language = item.languageAr || item.language;
  if (item.notes) db.notes = item.notesAr || item.notes;
  if (item.published !== undefined) db.published = item.published;
  return db;
}

export async function getJumuahTimes(includeUnpublished = false): Promise<JumuahTime[]> {
  const client = createClient();
  if (!client) return mockJumuahTimes;
  let query = client
    .from("jumuah_times")
    .select("*")
    .order("date", { ascending: true });
  if (!includeUnpublished) query = query.eq("published", true);
  const { data, error } = await query;
  if (error || !data) throw new Error("Unable to load Jumu'ah times");
  return data.map((row: unknown) => mapFromDb(row as Record<string, unknown>));
}

export async function createJumuahTime(item: Omit<JumuahTime, "id">): Promise<JumuahTime> {
  const client = createClient();
  if (!client) return { ...item, id: `mock-${Date.now()}` } as JumuahTime;
  const { data, error } = await client.from("jumuah_times").insert(mapToDb(item)).select().single();
  if (error || !data) throw new Error("Failed to create Jumu'ah time");
  return mapFromDb(data as Record<string, unknown>);
}

export async function updateJumuahTime(id: string, item: Partial<JumuahTime>): Promise<JumuahTime> {
  const client = createClient();
  if (!client) {
    const existing = mockJumuahTimes.find((j) => j.id === id);
    if (!existing) throw new Error("Not found");
    return { ...existing, ...item } as JumuahTime;
  }
  const { data, error } = await client.from("jumuah_times").update(mapToDb(item)).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update Jumu'ah time");
  return mapFromDb(data as Record<string, unknown>);
}

export async function deleteJumuahTime(id: string): Promise<void> {
  const client = createClient();
  if (!client) return;
  const { error } = await client.from("jumuah_times").delete().eq("id", id);
  if (error) throw new Error("Failed to delete Jumu'ah time");
}
