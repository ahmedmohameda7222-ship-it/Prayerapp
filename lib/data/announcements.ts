import { createClient } from "@/lib/supabase/client";
import { announcements as mockAnnouncements } from "@/lib/mock-data";
import type { Announcement } from "@/lib/types";

function mapFromDb(row: Record<string, unknown>): Announcement {
  return {
    id: String(row.id),
    title: String(row.title),
    message: String(row.message),
    type: String(row.type) as Announcement["type"],
    isUrgent: Boolean(row.is_urgent),
    published: Boolean(row.published),
    createdAt: String(row.created_at),
  };
}

function mapToDb(item: Partial<Announcement>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (item.id) db.id = item.id;
  if (item.title) db.title = item.title;
  if (item.message) db.message = item.message;
  if (item.type) db.type = item.type;
  if (item.isUrgent !== undefined) db.is_urgent = item.isUrgent;
  if (item.published !== undefined) db.published = item.published;
  db.created_at = new Date().toISOString();
  return db;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const client = createClient();
  if (!client) return mockAnnouncements.filter((a) => a.published);
  const { data, error } = await client
    .from("announcements")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error || !data) return mockAnnouncements.filter((a) => a.published);
  return data.map((row: unknown) => mapFromDb(row as Record<string, unknown>));
}

export async function createAnnouncement(item: Omit<Announcement, "id" | "createdAt">): Promise<Announcement> {
  const client = createClient();
  if (!client) {
    return { ...item, id: `mock-${Date.now()}`, createdAt: new Date().toISOString() } as Announcement;
  }
  const { data, error } = await client.from("announcements").insert(mapToDb(item)).select().single();
  if (error || !data) throw new Error("Failed to create announcement");
  return mapFromDb(data as Record<string, unknown>);
}

export async function updateAnnouncement(id: string, item: Partial<Announcement>): Promise<Announcement> {
  const client = createClient();
  if (!client) {
    const existing = mockAnnouncements.find((a) => a.id === id);
    if (!existing) throw new Error("Not found");
    return { ...existing, ...item } as Announcement;
  }
  const { data, error } = await client.from("announcements").update(mapToDb(item)).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update announcement");
  return mapFromDb(data as Record<string, unknown>);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const client = createClient();
  if (!client) return;
  const { error } = await client.from("announcements").delete().eq("id", id);
  if (error) throw new Error("Failed to delete announcement");
}
