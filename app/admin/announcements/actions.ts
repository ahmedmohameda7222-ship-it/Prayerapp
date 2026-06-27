"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";
import type { AnnouncementType } from "@/lib/types";
import { sendAdminContentPush } from "@/lib/push/web-push";

const validTypes: AnnouncementType[] = ["General", "Urgent", "Location update", "Community", "Ramadan", "Eid", "Donation"];

type AnnouncementPushRow = {
  id: string;
  title: string;
  title_ar?: string | null;
  title_en?: string | null;
  title_de?: string | null;
  title_tr?: string | null;
  is_urgent: boolean;
  published: boolean;
};

async function notifyUrgentAnnouncement(row: AnnouncementPushRow) {
  if (!row.is_urgent || !row.published) return;
  try {
    await sendAdminContentPush({
      eventKey: `announcement:${row.id}:urgent-published`,
      notificationType: "urgent_announcement",
      sourceId: row.id,
      url: "/news",
      contentTitle: {
        fallback: row.title,
        ar: row.title_ar,
        en: row.title_en,
        de: row.title_de,
        tr: row.title_tr,
      },
    });
  } catch (error) {
    console.error("[announcement push] delivery failed", error);
  }
}

function validateAnnouncement(data: Record<string, string>) {
  const errors: string[] = [];
  if (!data.titleAr?.trim()) errors.push("admin.errors.arabicTitleRequired");
  if (!data.messageAr?.trim()) errors.push("admin.errors.arabicMessageRequired");
  if (!data.type || !validTypes.includes(data.type as AnnouncementType)) {
    errors.push("admin.errors.typeRequired");
  }
  if ((data.titleAr || "").length > 200 || (data.messageAr || "").length > 5000) errors.push("admin.errors.invalidInput");
  return errors;
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

  await notifyUrgentAnnouncement(result as AnnouncementPushRow);

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

  const { data: previous } = await client
    .from("announcements")
    .select("is_urgent, published")
    .eq("id", id)
    .maybeSingle();

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

  const { data: result, error } = await client.from("announcements").update(db).eq("id", id).select().single();
  if (error) {
    return { success: false, error: "admin.errors.saveFailed" };
  }


  if (!(previous?.is_urgent && previous?.published)) {
    await notifyUrgentAnnouncement(result as AnnouncementPushRow);
  }

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

  const { data: result, error } = await client.from("announcements").update({ published }).eq("id", id).select().single();
  if (error) {
    return { success: false, error: "admin.errors.toggleFailed" };
  }

  if (published) await notifyUrgentAnnouncement(result as AnnouncementPushRow);

  const verb = published ? "published" : "unpublished";
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

  const { data: result, error } = await client.from("announcements").update({ is_urgent: isUrgent }).eq("id", id).select().single();
  if (error) {
    return { success: false, error: "admin.errors.toggleFailed" };
  }

  if (isUrgent) await notifyUrgentAnnouncement(result as AnnouncementPushRow);

  const verb = isUrgent ? "marked urgent" : "unmarked urgent";
  revalidatePath("/admin/announcements");
  revalidatePath("/news");
  revalidatePath("/");
  return { success: true };
}
