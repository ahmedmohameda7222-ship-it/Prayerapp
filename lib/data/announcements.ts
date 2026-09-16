import { createClient } from "../supabase/client";
import { getCached, setCached } from "./cache";
import { persistentPublicCache, readPersistentPublicCache } from "./persistent-public-cache";
import type { Announcement, AnnouncementType } from "../types";

const fallback: Announcement[] = [];

function mapRow(row: Record<string, unknown>): Announcement {
  return {
    id: String(row.id),
    title: String(row.title || ""),
    titleAr: row.title_ar ? String(row.title_ar) : undefined,
    titleEn: row.title_en ? String(row.title_en) : undefined,
    titleDe: row.title_de ? String(row.title_de) : undefined,
    titleTr: row.title_tr ? String(row.title_tr) : undefined,
    message: String(row.message || ""),
    messageAr: row.message_ar ? String(row.message_ar) : undefined,
    messageEn: row.message_en ? String(row.message_en) : undefined,
    messageDe: row.message_de ? String(row.message_de) : undefined,
    messageTr: row.message_tr ? String(row.message_tr) : undefined,
    type: row.type as AnnouncementType,
    isUrgent: Boolean(row.is_urgent),
    displayStyle: row.display_style === "special" ? "special" : "normal",
    displayFrom: row.display_from ? String(row.display_from) : undefined,
    displayUntil: row.display_until ? String(row.display_until) : undefined,
    published: Boolean(row.published),
    createdAt: String(row.created_at || ""),
  };
}

export async function getAnnouncements(includeUnpublished = false): Promise<Announcement[]> {
  const cacheKey = includeUnpublished ? "announcements_all" : "announcements_public";
  const cached = getCached<Announcement[]>(cacheKey);
  if (cached) return cached;
  const client = createClient();
  if (!client) return fallback;
  let query = client.from("announcements").select("*").order("created_at", { ascending: false });
  if (!includeUnpublished) query = query.eq("published", true);
  const { data, error } = await query;
  if (error || !data) return includeUnpublished ? fallback : (await readPersistentPublicCache(cacheKey, fallback));
  const result = data.map((row) => mapRow(row as Record<string, unknown>));
  setCached(cacheKey, result);
  if (!includeUnpublished) await persistentPublicCache(cacheKey, result);
  return result;
}
