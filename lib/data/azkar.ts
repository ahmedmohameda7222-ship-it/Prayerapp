import { createClient } from "@/lib/supabase/client";
import { azkarCategories as mockCategories, azkarItems as mockItems } from "@/lib/mock-data";
import type { AzkarCategory, AzkarItem } from "@/lib/types";
import { localizedFieldsFromDb, localizedFieldsToDb, readDbString } from "./localized-db";

export async function getAzkarCategories(): Promise<AzkarCategory[]> {
  const client = createClient();
  if (!client) return mockCategories;
  const { data, error } = await client.from("azkar_categories").select("name").order("sort_order", { ascending: true });
  if (error || !data) throw new Error("Unable to load azkar categories");
  return data.map((row: unknown) => String((row as Record<string, unknown>).name)) as AzkarCategory[];
}

export async function getAzkarItems(includeUnpublished = false): Promise<AzkarItem[]> {
  const client = createClient();
  if (!client) return mockItems.filter((i) => i.isPublished);
  let query = client
    .from("azkar_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (!includeUnpublished) query = query.eq("is_published", true);
  const { data, error } = await query;
  if (error || !data) throw new Error("Unable to load azkar");
  return data.map((row: unknown) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      category: String(record.category) as AzkarCategory,
      arabicText: String(record.arabic_text),
      transliteration: String(record.transliteration),
      translationEn: readDbString(record, "translation_en"),
      translationDe: readDbString(record, "translation_de"),
      translationAr: readDbString(record, "translation_ar"),
      translationTr: readDbString(record, "translation_tr"),
      repeatCount: Number(record.repeat_count),
      source: String(record.source),
      sortOrder: Number(record.sort_order),
      isPublished: Boolean(record.is_published),
      ...localizedFieldsFromDb(record, "translation", "translation"),
    };
  });
}

export async function createAzkarItem(item: Omit<AzkarItem, "id">): Promise<AzkarItem> {
  const client = createClient();
  if (!client) return { ...item, id: `mock-${Date.now()}` };
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
  const { data, error } = await client.from("azkar_items").insert(db).select().single();
  if (error || !data) throw new Error("Failed to create azkar item");
  return { ...item, id: String((data as Record<string, unknown>).id) };
}

export async function updateAzkarItem(id: string, item: Partial<AzkarItem>): Promise<AzkarItem> {
  const client = createClient();
  if (!client) {
    const existing = mockItems.find((i) => i.id === id);
    if (!existing) throw new Error("Not found");
    return { ...existing, ...item };
  }
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
  const { data, error } = await client.from("azkar_items").update(db).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update azkar item");
  return { ...item, id: String((data as Record<string, unknown>).id) } as AzkarItem;
}

export async function deleteAzkarItem(id: string): Promise<void> {
  const client = createClient();
  if (!client) return;
  const { error } = await client.from("azkar_items").delete().eq("id", id);
  if (error) throw new Error("Failed to delete azkar item");
}
