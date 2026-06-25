"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";
import type { AnnouncementType } from "@/lib/types";

const validTypes: AnnouncementType[] = ["General", "Urgent", "Location update", "Community", "Ramadan", "Eid", "Donation"];

function validateAnnouncement(data: Record<string, string>) {
  const errors: string[] = [];
  if (!data.titleAr?.trim()) errors.push("admin.errors.arabicTitleRequired");
  if (!data.messageAr?.trim()) errors.push("admin.errors.arabicMessageRequired");
  if (!data.type || !validTypes.includes(data.type as AnnouncementType)) {
    errors.push("admin.errors.typeRequired");
  }
  return errors;
}

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

export async function createAnnouncementAction(
  token: string,
  data: Record<string, string>
) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const errors = validateAnnouncement(data);
  if (errors.length > 0) {
    return { success: false, error: errors[0] };
  }

  const db = {
    title: data.titleAr.trim(),
    title_ar: data.titleAr.trim(),
    title_en: data.titleEn?.trim() || null,
    title_de: data.titleDe?.trim() || null,
    title_tr: data.titleTr?.trim() || null,
    message: data.messageAr.trim(),
    message_ar: data.messageAr.trim(),
    message_en: data.messageEn?.trim() || null,
    message_de: data.messageDe?.trim() || null,
    message_tr: data.messageTr?.trim() || null,
    type: data.type,
    is_urgent: data.isUrgent === "true",
    published: data.published === "true",
  };

  const { data: result, error } = await client.from("announcements").insert(db).select().single();
  if (error) {
    return { success: false, error: "admin.errors.saveFailed" };
  }

  await createAuditLog(email, `created announcement "${data.titleAr.trim()}"`, "announcement", String((result as Record<string, unknown>).id));
  revalidatePath("/admin/announcements");
  revalidatePath("/news");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}

export async function updateAnnouncementAction(
  token: string,
  id: string,
  data: Record<string, string>
) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const errors = validateAnnouncement(data);
  if (errors.length > 0) {
    return { success: false, error: errors[0] };
  }

  const db = {
    title: data.titleAr.trim(),
    title_ar: data.titleAr.trim(),
    title_en: data.titleEn?.trim() || null,
    title_de: data.titleDe?.trim() || null,
    title_tr: data.titleTr?.trim() || null,
    message: data.messageAr.trim(),
    message_ar: data.messageAr.trim(),
    message_en: data.messageEn?.trim() || null,
    message_de: data.messageDe?.trim() || null,
    message_tr: data.messageTr?.trim() || null,
    type: data.type,
    is_urgent: data.isUrgent === "true",
    published: data.published === "true",
  };

  const { error } = await client.from("announcements").update(db).eq("id", id).select().single();
  if (error) {
    return { success: false, error: "admin.errors.saveFailed" };
  }

  await createAuditLog(email, `updated announcement "${data.titleAr.trim()}"`, "announcement", id);
  revalidatePath("/admin/announcements");
  revalidatePath("/news");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAnnouncementAction(token: string, id: string) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const { error } = await client.from("announcements").delete().eq("id", id);
  if (error) {
    return { success: false, error: "admin.errors.deleteFailed" };
  }

  await createAuditLog(email, `deleted announcement ${id}`, "announcement", id);
  revalidatePath("/admin/announcements");
  revalidatePath("/news");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}

export async function togglePublishAnnouncementAction(token: string, id: string, published: boolean) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const { error } = await client.from("announcements").update({ published }).eq("id", id);
  if (error) {
    return { success: false, error: "admin.errors.toggleFailed" };
  }

  const verb = published ? "published" : "unpublished";
  await createAuditLog(email, `${verb} announcement ${id}`, "announcement", id);
  revalidatePath("/admin/announcements");
  revalidatePath("/news");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}

export async function toggleUrgentAnnouncementAction(token: string, id: string, isUrgent: boolean) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const { error } = await client.from("announcements").update({ is_urgent: isUrgent }).eq("id", id);
  if (error) {
    return { success: false, error: "admin.errors.toggleFailed" };
  }

  const verb = isUrgent ? "marked urgent" : "unmarked urgent";
  await createAuditLog(email, `${verb} announcement ${id}`, "announcement", id);
  revalidatePath("/admin/announcements");
  revalidatePath("/news");
  revalidatePath("/");
  return { success: true };
}
