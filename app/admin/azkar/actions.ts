"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";

async function createAuditLog(
  actor: string,
  action: string,
  entityType: string,
  entityId?: string
) {
  const client = createServerClient();
  if (!client) return;
  try {
    await client.from("audit_logs").insert({
      actor,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

function validateAzkar(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!data.category?.trim()) errors.push("Category is required");
  if (!data.arabicText?.trim()) errors.push("Arabic text is required");
  const repeatCount = Number(data.repeatCount);
  if (Number.isNaN(repeatCount) || repeatCount <= 0) errors.push("Repeat count must be a positive number");
  return errors;
}

export async function createAzkarAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const errors = validateAzkar(data);
  if (errors.length > 0) return { success: false, error: errors.join("; ") };

  const db = {
    category: data.category.trim(),
    arabic_text: data.arabicText.trim(),
    transliteration: data.transliteration?.trim() || "",
    translation_en: data.translationEn?.trim() || "",
    translation_de: data.translationDe?.trim() || "",
    repeat_count: Number(data.repeatCount),
    source: data.source?.trim() || "",
    sort_order: Number(data.sortOrder || "0"),
    is_published: data.isPublished === "true",
  };

  const { data: result, error } = await client.from("azkar_items").insert(db).select().single();
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, "created azkar item", "azkar", String((result as Record<string, unknown>).id));
  revalidatePath("/admin/azkar");
  revalidatePath("/azkar");
  return { success: true };
}

export async function updateAzkarAction(
  token: string,
  id: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const errors = validateAzkar(data);
  if (errors.length > 0) return { success: false, error: errors.join("; ") };

  const db = {
    category: data.category.trim(),
    arabic_text: data.arabicText.trim(),
    transliteration: data.transliteration?.trim() || "",
    translation_en: data.translationEn?.trim() || "",
    translation_de: data.translationDe?.trim() || "",
    repeat_count: Number(data.repeatCount),
    source: data.source?.trim() || "",
    sort_order: Number(data.sortOrder || "0"),
    is_published: data.isPublished === "true",
  };

  const { error } = await client.from("azkar_items").update(db).eq("id", id);
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, "updated azkar item", "azkar", id);
  revalidatePath("/admin/azkar");
  revalidatePath("/azkar");
  return { success: true };
}

export async function deleteAzkarAction(token: string, id: string): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const { error } = await client.from("azkar_items").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, "deleted azkar item", "azkar", id);
  revalidatePath("/admin/azkar");
  revalidatePath("/azkar");
  return { success: true };
}

export async function togglePublishAzkarAction(token: string, id: string, isPublished: boolean): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const { error } = await client.from("azkar_items").update({ is_published: isPublished }).eq("id", id);
  if (error) return { success: false, error: error.message };

  const verb = isPublished ? "published" : "unpublished";
  await createAuditLog(email, `${verb} azkar item ${id}`, "azkar", id);
  revalidatePath("/admin/azkar");
  revalidatePath("/azkar");
  return { success: true };
}
