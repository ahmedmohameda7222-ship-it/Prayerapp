import { createClient } from "@/lib/supabase/client";
import type { RamadanDay } from "@/lib/types";
import { previewRamadanDays } from "./demo-data";
import { localizedFieldsFromDb, localizedFieldsToDb, readDbString } from "./localized-db";
import { getCached, invalidateCache, invalidateCachePrefix } from "./cache";

export async function getRamadanDays(includeUnpublished = false): Promise<RamadanDay[]> {
  const client = createClient();
  if (!client) {
    return previewRamadanDays.filter((item) => includeUnpublished || item.published !== false);
  }
  const key = `ramadan_days_${includeUnpublished}`;
  return getCached(key, async () => {
    let query = client.from("ramadan_days").select("*").order("date", { ascending: true });
    if (!includeUnpublished) query = query.eq("published", true);
    const { data, error } = await query;
    if (error || !data) throw new Error("Unable to load Ramadan schedule");
    return data.map((row: unknown) => {
      const record = row as Record<string, unknown>;
      return {
        id: String(record.id),
        date: String(record.date),
        ramadanDay: Number(record.ramadan_day),
        imsak: String(record.imsak),
        fajr: String(record.fajr),
        maghrib: String(record.maghrib),
        iftar: String(record.iftar),
        taraweeh: String(record.taraweeh),
        note: readDbString(record, "note") || undefined,
        published: record.published !== false,
        ...localizedFieldsFromDb(record, "note", "note"),
      };
    });
  });
}

export async function createRamadanDay(item: Omit<RamadanDay, "id">): Promise<RamadanDay> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const db = {
    date: item.date,
    ramadan_day: item.ramadanDay,
    imsak: item.imsak,
    fajr: item.fajr,
    maghrib: item.maghrib,
    iftar: item.iftar,
    taraweeh: item.taraweeh,
    note: item.noteAr || item.note,
    ...localizedFieldsToDb(item as unknown as Record<string, unknown>, "note", "note", { includeLegacy: true }),
  };
  const { data, error } = await client.from("ramadan_days").insert(db as never).select().single();
  if (error || !data) throw new Error("Failed to create Ramadan day");
  invalidateCachePrefix("ramadan_days");
  return { ...item, id: String((data as Record<string, unknown>).id) };
}

export async function updateRamadanDay(id: string, item: Partial<RamadanDay>): Promise<RamadanDay> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const db: Record<string, unknown> = {};
  if (item.date) db.date = item.date;
  if (item.ramadanDay !== undefined) db.ramadan_day = item.ramadanDay;
  if (item.imsak) db.imsak = item.imsak;
  if (item.fajr) db.fajr = item.fajr;
  if (item.maghrib) db.maghrib = item.maghrib;
  if (item.iftar) db.iftar = item.iftar;
  if (item.taraweeh) db.taraweeh = item.taraweeh;
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "note", "note", { includeLegacy: true }));
  if (item.note !== undefined) db.note = item.noteAr || item.note;
  const { data, error } = await client.from("ramadan_days").update(db as never).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update Ramadan day");
  invalidateCachePrefix("ramadan_days");
  return { ...item, id: String((data as Record<string, unknown>).id) } as RamadanDay;
}

export async function deleteRamadanDay(id: string): Promise<void> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { error } = await client.from("ramadan_days").delete().eq("id", id);
  if (error) throw new Error("Failed to delete Ramadan day");
  invalidateCachePrefix("ramadan_days");
}
