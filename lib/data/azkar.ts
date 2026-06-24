import { createClient } from "@/lib/supabase/client";
import { azkarCategories as mockCategories, azkarItems as mockItems } from "@/lib/mock-data";
import type { AzkarCategory, AzkarItem } from "@/lib/types";

export async function getAzkarCategories(): Promise<AzkarCategory[]> {
  const client = createClient();
  if (!client) return mockCategories;
  const { data, error } = await client.from("azkar_categories").select("name").order("sort_order", { ascending: true });
  if (error || !data) return mockCategories;
  return data.map((row: unknown) => String((row as Record<string, unknown>).name)) as AzkarCategory[];
}

export async function getAzkarItems(): Promise<AzkarItem[]> {
  const client = createClient();
  if (!client) return mockItems.filter((i) => i.isPublished);
  const { data, error } = await client
    .from("azkar_items")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return mockItems.filter((i) => i.isPublished);
  return data.map((row: unknown) => ({
    id: String((row as Record<string, unknown>).id),
    category: String((row as Record<string, unknown>).category) as AzkarCategory,
    arabicText: String((row as Record<string, unknown>).arabic_text),
    transliteration: String((row as Record<string, unknown>).transliteration),
    translationEn: String((row as Record<string, unknown>).translation_en),
    translationDe: String((row as Record<string, unknown>).translation_de),
    repeatCount: Number((row as Record<string, unknown>).repeat_count),
    source: String((row as Record<string, unknown>).source),
    sortOrder: Number((row as Record<string, unknown>).sort_order),
    isPublished: Boolean((row as Record<string, unknown>).is_published),
  }));
}

export async function createAzkarItem(item: Omit<AzkarItem, "id">): Promise<AzkarItem> {
  const client = createClient();
  if (!client) return { ...item, id: `mock-${Date.now()}` };
  const db = {
    category: item.category,
    arabic_text: item.arabicText,
    transliteration: item.transliteration,
    translation_en: item.translationEn,
    translation_de: item.translationDe,
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
  if (item.translationEn) db.translation_en = item.translationEn;
  if (item.translationDe) db.translation_de = item.translationDe;
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
