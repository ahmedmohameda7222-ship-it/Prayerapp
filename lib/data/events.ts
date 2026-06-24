import { createClient } from "@/lib/supabase/client";
import { events as mockEvents } from "@/lib/mock-data";
import type { Event } from "@/lib/types";

export async function getEvents(): Promise<Event[]> {
  const client = createClient();
  if (!client) return mockEvents;
  const { data, error } = await client.from("events").select("*").order("date", { ascending: true });
  if (error || !data) return mockEvents;
  return data.map((row: unknown) => ({
    id: String((row as Record<string, unknown>).id),
    title: String((row as Record<string, unknown>).title),
    description: String((row as Record<string, unknown>).description),
    date: String((row as Record<string, unknown>).date),
    startTime: String((row as Record<string, unknown>).start_time),
    endTime: String((row as Record<string, unknown>).end_time),
    location: String((row as Record<string, unknown>).location),
    type: String((row as Record<string, unknown>).type),
  }));
}

export async function createEvent(item: Omit<Event, "id">): Promise<Event> {
  const client = createClient();
  if (!client) return { ...item, id: `mock-${Date.now()}` };
  const db = {
    title: item.title,
    description: item.description,
    date: item.date,
    start_time: item.startTime,
    end_time: item.endTime,
    location: item.location,
    type: item.type,
  };
  const { data, error } = await client.from("events").insert(db).select().single();
  if (error || !data) throw new Error("Failed to create event");
  return { ...item, id: String((data as Record<string, unknown>).id) };
}

export async function updateEvent(id: string, item: Partial<Event>): Promise<Event> {
  const client = createClient();
  if (!client) {
    const existing = mockEvents.find((e) => e.id === id);
    if (!existing) throw new Error("Not found");
    return { ...existing, ...item };
  }
  const db: Record<string, unknown> = {};
  if (item.title) db.title = item.title;
  if (item.description) db.description = item.description;
  if (item.date) db.date = item.date;
  if (item.startTime) db.start_time = item.startTime;
  if (item.endTime) db.end_time = item.endTime;
  if (item.location) db.location = item.location;
  if (item.type) db.type = item.type;
  const { data, error } = await client.from("events").update(db).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update event");
  return { ...item, id: String((data as Record<string, unknown>).id) } as Event;
}

export async function deleteEvent(id: string): Promise<void> {
  const client = createClient();
  if (!client) return;
  const { error } = await client.from("events").delete().eq("id", id);
  if (error) throw new Error("Failed to delete event");
}
