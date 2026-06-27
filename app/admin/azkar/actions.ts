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
  if (!["Morning", "Evening", "After Prayer", "Sleep", "Travel", "Friday"].includes(data.category || "")) errors.push("admin.errors.categoryRequired");
  if (!data.arabicText?.trim()) errors.push("admin.errors.arabicTextRequired");
  const repeatCount = Number(data.repeatCount);
  if (!Number.isInteger(repeatCount) || repeatCount <= 0 || repeatCount > 10000) errors.push("admin.errors.repeatCountPositive");
  const sortOrder = Number(data.sortOrder || "0");
  if (!Number.isInteger(sortOrder) || Math.abs(sortOrder) > 100000) errors.push("admin.errors.invalidInput");
  if ((data.arabicText || "").length > 5000 || (data.source || "").length > 500) errors.push("admin.errors.invalidInput");
  return errors;
}

export async function createAzkarAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const errors = validateAzkar(data);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const db = {
    category: data.category.trim(),
    arabic_text: data.arabicText.trim(),
    transliteration: data.transliteration?.trim() || "",
    translation_ar: data.translationAr?.trim() || "",
    translation_en: data.translationEn?.trim() || "",
    translation_de: data.translationDe?.trim() || "",
    translation_tr: data.translationTr?.trim() || "",
    repeat_count: Number(data.repeatCount),
    source: data.source?.trim() || "",
    sort_order: Number(data.sortOrder || "0"),
    is_published: data.isPublished === "true",
  };

  const { data: result, error } = await client.from("azkar_items").insert(db).select().single();
  if (error) return { success: false, error: "admin.errors.saveFailed" };

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
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const errors = validateAzkar(data);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const db = {
    category: data.category.trim(),
    arabic_text: data.arabicText.trim(),
    transliteration: data.transliteration?.trim() || "",
    translation_ar: data.translationAr?.trim() || "",
    translation_en: data.translationEn?.trim() || "",
    translation_de: data.translationDe?.trim() || "",
    translation_tr: data.translationTr?.trim() || "",
    repeat_count: Number(data.repeatCount),
    source: data.source?.trim() || "",
    sort_order: Number(data.sortOrder || "0"),
    is_published: data.isPublished === "true",
  };

  const { error } = await client.from("azkar_items").update(db).eq("id", id);
  if (error) return { success: false, error: "admin.errors.saveFailed" };

  await createAuditLog(email, "updated azkar item", "azkar", id);
  revalidatePath("/admin/azkar");
  revalidatePath("/azkar");
  return { success: true };
}

export async function deleteAzkarAction(token: string, id: string): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const { error } = await client.from("azkar_items").delete().eq("id", id);
  if (error) return { success: false, error: "admin.errors.deleteFailed" };

  await createAuditLog(email, "deleted azkar item", "azkar", id);
  revalidatePath("/admin/azkar");
  revalidatePath("/azkar");
  return { success: true };
}

export async function togglePublishAzkarAction(token: string, id: string, isPublished: boolean): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const { error } = await client.from("azkar_items").update({ is_published: isPublished }).eq("id", id);
  if (error) return { success: false, error: "admin.errors.toggleFailed" };

  const verb = isPublished ? "published" : "unpublished";
  await createAuditLog(email, `${verb} azkar item ${id}`, "azkar", id);
  revalidatePath("/admin/azkar");
  revalidatePath("/azkar");
  return { success: true };
}
