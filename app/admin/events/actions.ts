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

function validateEvent(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!data.titleAr?.trim()) errors.push("admin.errors.arabicTitleRequired");
  if (!data.descriptionAr?.trim()) errors.push("admin.errors.arabicDescriptionRequired");
  if (!data.locationAr?.trim()) errors.push("admin.errors.arabicLocationRequired");
  if (!data.date?.trim()) errors.push("admin.errors.dateRequired");
  if (!data.startTime?.trim()) errors.push("admin.errors.startTimeRequired");
  if (!data.type?.trim()) errors.push("admin.errors.typeRequired");
  return errors;
}

export async function createEventAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const errors = validateEvent(data);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const db = {
    title: data.titleAr.trim(),
    title_ar: data.titleAr.trim(),
    title_en: data.titleEn?.trim() || null,
    title_de: data.titleDe?.trim() || null,
    title_tr: data.titleTr?.trim() || null,
    description: data.descriptionAr.trim(),
    description_ar: data.descriptionAr.trim(),
    description_en: data.descriptionEn?.trim() || null,
    description_de: data.descriptionDe?.trim() || null,
    description_tr: data.descriptionTr?.trim() || null,
    date: data.date,
    start_time: data.startTime,
    end_time: data.endTime?.trim() || null,
    location: data.locationAr.trim(),
    location_ar: data.locationAr.trim(),
    location_en: data.locationEn?.trim() || null,
    location_de: data.locationDe?.trim() || null,
    location_tr: data.locationTr?.trim() || null,
    type: data.type.trim(),
  };

  const { data: result, error } = await client.from("events").insert(db).select().single();
  if (error) return { success: false, error: "admin.errors.saveFailed" };

  await createAuditLog(email, `created event "${data.titleAr.trim()}"`, "event", String((result as Record<string, unknown>).id));
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  return { success: true };
}

export async function updateEventAction(
  token: string,
  id: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const errors = validateEvent(data);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const db = {
    title: data.titleAr.trim(),
    title_ar: data.titleAr.trim(),
    title_en: data.titleEn?.trim() || null,
    title_de: data.titleDe?.trim() || null,
    title_tr: data.titleTr?.trim() || null,
    description: data.descriptionAr.trim(),
    description_ar: data.descriptionAr.trim(),
    description_en: data.descriptionEn?.trim() || null,
    description_de: data.descriptionDe?.trim() || null,
    description_tr: data.descriptionTr?.trim() || null,
    date: data.date,
    start_time: data.startTime,
    end_time: data.endTime?.trim() || null,
    location: data.locationAr.trim(),
    location_ar: data.locationAr.trim(),
    location_en: data.locationEn?.trim() || null,
    location_de: data.locationDe?.trim() || null,
    location_tr: data.locationTr?.trim() || null,
    type: data.type.trim(),
  };

  const { error } = await client.from("events").update(db).eq("id", id);
  if (error) return { success: false, error: "admin.errors.saveFailed" };

  await createAuditLog(email, `updated event "${data.titleAr.trim()}"`, "event", id);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  return { success: true };
}

export async function deleteEventAction(token: string, id: string): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const { error } = await client.from("events").delete().eq("id", id);
  if (error) return { success: false, error: "admin.errors.deleteFailed" };

  await createAuditLog(email, `deleted event ${id}`, "event", id);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  return { success: true };
}
