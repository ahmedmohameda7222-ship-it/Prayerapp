"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";
import { sendAdminContentPush } from "@/lib/push/web-push";


function validateEvent(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!data.titleAr?.trim()) errors.push("admin.errors.arabicTitleRequired");
  if (!data.descriptionAr?.trim()) errors.push("admin.errors.arabicDescriptionRequired");
  if (!data.locationAr?.trim()) errors.push("admin.errors.arabicLocationRequired");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) errors.push("admin.errors.dateRequired");
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.startTime || "")) errors.push("admin.errors.startTimeRequired");
  if (data.endTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.endTime)) errors.push("admin.errors.invalidTimeFormat");
  if (data.endTime && data.endTime <= data.startTime) errors.push("admin.errors.endTimeAfterStart");
  if (!data.type?.trim()) errors.push("admin.errors.typeRequired");
  if (data.titleAr?.length > 200 || data.descriptionAr?.length > 4000 || data.locationAr?.length > 300) errors.push("admin.errors.invalidInput");
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

  try {
    await sendAdminContentPush({
      eventKey: `event:${result.id}:published`,
      notificationType: "event",
      sourceId: result.id,
      url: "/events",
      contentTitle: {
        fallback: result.title,
        ar: result.title_ar,
        en: result.title_en,
        de: result.title_de,
        tr: result.title_tr,
      },
    });
  } catch (pushError) {
    console.error("[event push] delivery failed", pushError);
  }

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

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  return { success: true };
}
