import { createClient } from "@/lib/supabase/client";
import { ramadanDays as mockRamadanDays } from "@/lib/mock-data";
import type { RamadanDay } from "@/lib/types";

export async function getRamadanDays(): Promise<RamadanDay[]> {
  const client = createClient();
  if (!client) return mockRamadanDays;
  const { data, error } = await client.from("ramadan_days").select("*").order("date", { ascending: true });
  if (error || !data) return mockRamadanDays;
  return data.map((row: unknown) => ({
    id: String((row as Record<string, unknown>).id),
    date: String((row as Record<string, unknown>).date),
    ramadanDay: Number((row as Record<string, unknown>).ramadan_day),
    imsak: String((row as Record<string, unknown>).imsak),
    fajr: String((row as Record<string, unknown>).fajr),
    maghrib: String((row as Record<string, unknown>).maghrib),
    iftar: String((row as Record<string, unknown>).iftar),
    taraweeh: String((row as Record<string, unknown>).taraweeh),
    note: (row as Record<string, unknown>).note ? String((row as Record<string, unknown>).note) : undefined,
  }));
}

export async function createRamadanDay(item: Omit<RamadanDay, "id">): Promise<RamadanDay> {
  const client = createClient();
  if (!client) return { ...item, id: `mock-${Date.now()}` };
  const db = {
    date: item.date,
    ramadan_day: item.ramadanDay,
    imsak: item.imsak,
    fajr: item.fajr,
    maghrib: item.maghrib,
    iftar: item.iftar,
    taraweeh: item.taraweeh,
    note: item.note,
  };
  const { data, error } = await client.from("ramadan_days").insert(db).select().single();
  if (error || !data) throw new Error("Failed to create Ramadan day");
  return { ...item, id: String((data as Record<string, unknown>).id) };
}

export async function updateRamadanDay(id: string, item: Partial<RamadanDay>): Promise<RamadanDay> {
  const client = createClient();
  if (!client) {
    const existing = mockRamadanDays.find((d) => d.id === id);
    if (!existing) throw new Error("Not found");
    return { ...existing, ...item };
  }
  const db: Record<string, unknown> = {};
  if (item.date) db.date = item.date;
  if (item.ramadanDay !== undefined) db.ramadan_day = item.ramadanDay;
  if (item.imsak) db.imsak = item.imsak;
  if (item.fajr) db.fajr = item.fajr;
  if (item.maghrib) db.maghrib = item.maghrib;
  if (item.iftar) db.iftar = item.iftar;
  if (item.taraweeh) db.taraweeh = item.taraweeh;
  if (item.note !== undefined) db.note = item.note;
  const { data, error } = await client.from("ramadan_days").update(db).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update Ramadan day");
  return { ...item, id: String((data as Record<string, unknown>).id) } as RamadanDay;
}

export async function deleteRamadanDay(id: string): Promise<void> {
  const client = createClient();
  if (!client) return;
  const { error } = await client.from("ramadan_days").delete().eq("id", id);
  if (error) throw new Error("Failed to delete Ramadan day");
}
