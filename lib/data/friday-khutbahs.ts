import { createClient } from "@/lib/supabase/client";
import type { FridayKhutbah } from "@/lib/types";
import { CACHE_TTL, getCached, invalidateCachePrefix } from "./cache";
import {
  clearPersistentCachePrefix,
  loadFromPersistentCache,
  saveToPersistentCache,
} from "./persistent-public-cache";

const FRIDAY_KHUTBAH_CACHE_PREFIX = "friday_khutbah_";

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function mapFromDb(row: Record<string, unknown>): FridayKhutbah {
  return {
    id: String(row.id),
    date: String(row.date),
    titleAr: optionalString(row.title_ar),
    contentAr: optionalString(row.content_ar),
    titleEn: optionalString(row.title_en),
    contentEn: optionalString(row.content_en),
    titleDe: optionalString(row.title_de),
    contentDe: optionalString(row.content_de),
    titleTr: optionalString(row.title_tr),
    contentTr: optionalString(row.content_tr),
    published: Boolean(row.published),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function invalidateFridayKhutbahCaches() {
  invalidateCachePrefix(FRIDAY_KHUTBAH_CACHE_PREFIX);
  clearPersistentCachePrefix(FRIDAY_KHUTBAH_CACHE_PREFIX);
}

export async function getFridayKhutbahByDate(
  date: string,
  includeUnpublished = false,
): Promise<FridayKhutbah | undefined> {
  const client = createClient();
  if (!client) return undefined;

  if (includeUnpublished) {
    const { data, error } = await client
      .from("friday_khutbahs")
      .select("*")
      .eq("date", date)
      .maybeSingle();
    if (error) throw new Error("Unable to load Friday khutbah");
    return data ? mapFromDb(data as Record<string, unknown>) : undefined;
  }

  const key = `${FRIDAY_KHUTBAH_CACHE_PREFIX}${date}`;
  return getCached(key, async () => {
    try {
      const { data, error } = await client
        .from("friday_khutbahs")
        .select("*")
        .eq("date", date)
        .eq("published", true)
        .maybeSingle();
      if (error) throw new Error("Unable to load Friday khutbah");

      const result = data ? mapFromDb(data as Record<string, unknown>) : undefined;
      saveToPersistentCache(key, result, CACHE_TTL.jumuah, CACHE_TTL.jumuah);
      return result;
    } catch (error) {
      const cached = loadFromPersistentCache<FridayKhutbah | undefined>(key);
      if (cached !== undefined) return cached;
      throw error;
    }
  }, CACHE_TTL.jumuah);
}
