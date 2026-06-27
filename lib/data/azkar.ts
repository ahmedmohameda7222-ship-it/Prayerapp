import { createClient } from "@/lib/supabase/client";
import type { AzkarCategory, AzkarItem } from "@/lib/types";
import { hardcodedAzkarCategories, hardcodedAzkarItems } from "./hardcoded-azkar";
import { localizedFieldsToDb } from "./localized-db";
import { invalidateCachePrefix } from "./cache";

const categoryOrder = new Map<AzkarCategory, number>(
  hardcodedAzkarCategories.map((category, index) => [category, index])
);

export async function getAzkarCategories(): Promise<AzkarCategory[]> {
  return [...hardcodedAzkarCategories];
}

export async function getAzkarItems(includeUnpublished = false): Promise<AzkarItem[]> {
  return hardcodedAzkarItems
    .filter((item) => includeUnpublished || item.isPublished)
    .map((item) => ({ ...item }))
    .sort((a, b) => {
      const categoryDifference =
        (categoryOrder.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
        (categoryOrder.get(b.category) ?? Number.MAX_SAFE_INTEGER);
      return categoryDifference || a.sortOrder - b.sortOrder;
    });
}

export async function createAzkarItem(item: Omit<AzkarItem, "id">): Promise<AzkarItem> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const db = {
    category: item.category,
    arabic_text: item.arabicText,
    transliteration: item.transliteration,
    ...localizedFieldsToDb(item as unknown as Record<string, unknown>, "translation", "translation"),
    translation_ar: item.translationAr || "",
    translation_en: item.translationEn,
    translation_de: item.translationDe,
    translation_tr: item.translationTr || "",
    repeat_count: item.repeatCount,
    source: item.source,
    sort_order: item.sortOrder,
    is_published: item.isPublished,
  };
  const { data, error } = await client.from("azkar_items").insert(db as never).select().single();
  if (error || !data) throw new Error("Failed to create azkar item");
  invalidateCachePrefix("azkar_items");
  return { ...item, id: String((data as Record<string, unknown>).id) };
}

export async function updateAzkarItem(id: string, item: Partial<AzkarItem>): Promise<AzkarItem> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const db: Record<string, unknown> = {};
  if (item.category) db.category = item.category;
  if (item.arabicText) db.arabic_text = item.arabicText;
  if (item.transliteration) db.transliteration = item.transliteration;
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "translation", "translation"));
  if (item.translationAr !== undefined) db.translation_ar = item.translationAr;
  if (item.translationEn) db.translation_en = item.translationEn;
  if (item.translationDe) db.translation_de = item.translationDe;
  if (item.translationTr !== undefined) db.translation_tr = item.translationTr;
  if (item.repeatCount !== undefined) db.repeat_count = item.repeatCount;
  if (item.source) db.source = item.source;
  if (item.sortOrder !== undefined) db.sort_order = item.sortOrder;
  if (item.isPublished !== undefined) db.is_published = item.isPublished;
  const { data, error } = await client.from("azkar_items").update(db as never).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update azkar item");
  invalidateCachePrefix("azkar_items");
  return { ...item, id: String((data as Record<string, unknown>).id) } as AzkarItem;
}

export async function deleteAzkarItem(id: string): Promise<void> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { error } = await client.from("azkar_items").delete().eq("id", id);
  if (error) throw new Error("Failed to delete azkar item");
  invalidateCachePrefix("azkar_items");
}
