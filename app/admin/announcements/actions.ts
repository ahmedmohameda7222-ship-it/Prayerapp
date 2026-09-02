"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { AnnouncementType } from "@/lib/types";
import { sendAdminContentPush } from "@/lib/push/web-push";
import { adminActionError, beginAdminAudit, finishAdminAudit, type AdminAuditEvent } from "@/lib/security/admin-audit";
import { parseAdminBoolean, parseAdminEnum, parseAdminText, parseAdminUuid } from "@/lib/security/admin-input";

const validTypes: AnnouncementType[] = ["General", "Urgent", "Location update", "Community", "Ramadan", "Eid", "Donation"];

type ActionResult = { success: boolean; error?: string };
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

async function runAuditedAction(
  token: string,
  event: AdminAuditEvent,
  operation: () => Promise<ActionResult>,
): Promise<ActionResult> {
  let audit;
  try {
    audit = await beginAdminAudit(token, event);
  } catch (error) {
    return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") };
  }

  let result: ActionResult;
  try {
    result = await operation();
  } catch (error) {
    result = { success: false, error: adminActionError(error) };
  }
  try {
    await finishAdminAudit(audit, result.success ? "success" : "failure", result.error ? { error: result.error } : undefined);
  } catch {
    if (result.success) return { success: false, error: "admin.errors.auditUnavailable" };
  }
  return result;
}

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

function parseAnnouncement(data: Record<string, string>) {
  return {
    titleAr: parseAdminText(data.titleAr, { field: "titleAr", max: 200, required: true }),
    titleEn: parseAdminText(data.titleEn ?? "", { field: "titleEn", max: 200 }),
    titleDe: parseAdminText(data.titleDe ?? "", { field: "titleDe", max: 200 }),
    titleTr: parseAdminText(data.titleTr ?? "", { field: "titleTr", max: 200 }),
    messageAr: parseAdminText(data.messageAr, { field: "messageAr", max: 5_000, required: true }),
    messageEn: parseAdminText(data.messageEn ?? "", { field: "messageEn", max: 5_000 }),
    messageDe: parseAdminText(data.messageDe ?? "", { field: "messageDe", max: 5_000 }),
    messageTr: parseAdminText(data.messageTr ?? "", { field: "messageTr", max: 5_000 }),
    type: parseAdminEnum(data.type, "type", validTypes),
    isUrgent: data.isUrgent ? parseAdminBoolean(data.isUrgent, "isUrgent") : false,
    published: data.published ? parseAdminBoolean(data.published, "published") : false,
  };
}

export async function createAnnouncementAction(token: string, data: Record<string, string>) {
  return runAuditedAction(token, {
    action: "announcement.create",
    entityType: "announcement",
    metadata: { requestedType: data.type || null },
  }, async () => {
    let parsed;
    try {
      parsed = parseAnnouncement(data);
    } catch (error) {
      return { success: false, error: adminActionError(error, "admin.errors.invalidInput") };
    }
    const client = createServerClient();
    if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

    const db = {
      title: parsed.titleAr,
      title_ar: parsed.titleAr,
      title_en: parsed.titleEn || null,
      title_de: parsed.titleDe || null,
      title_tr: parsed.titleTr || null,
      message: parsed.messageAr,
      message_ar: parsed.messageAr,
      message_en: parsed.messageEn || null,
      message_de: parsed.messageDe || null,
      message_tr: parsed.messageTr || null,
      type: parsed.type,
      is_urgent: parsed.isUrgent,
      published: parsed.published,
    };
    const { data: result, error } = await client.from("announcements").insert(db).select().single();
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    await notifyUrgentAnnouncement(result as AnnouncementPushRow);
    revalidatePath("/admin/announcements"); revalidatePath("/news"); revalidatePath("/friday"); revalidatePath("/");
    return { success: true };
  });
}

export async function updateAnnouncementAction(token: string, id: string, data: Record<string, string>) {
  let entityId: string;
  try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "announcement.update", entityType: "announcement", entityId }, async () => {
    let parsed;
    try { parsed = parseAnnouncement(data); } catch (error) { return { success: false, error: adminActionError(error, "admin.errors.invalidInput") }; }
    const client = createServerClient();
    if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { data: previous } = await client.from("announcements").select("is_urgent, published").eq("id", entityId).maybeSingle();
    const db = {
      title: parsed.titleAr, title_ar: parsed.titleAr, title_en: parsed.titleEn || null, title_de: parsed.titleDe || null, title_tr: parsed.titleTr || null,
      message: parsed.messageAr, message_ar: parsed.messageAr, message_en: parsed.messageEn || null, message_de: parsed.messageDe || null, message_tr: parsed.messageTr || null,
      type: parsed.type, is_urgent: parsed.isUrgent, published: parsed.published,
    };
    const { data: result, error } = await client.from("announcements").update(db).eq("id", entityId).select().single();
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    if (!(previous?.is_urgent && previous?.published)) await notifyUrgentAnnouncement(result as AnnouncementPushRow);
    revalidatePath("/admin/announcements"); revalidatePath("/news"); revalidatePath("/friday"); revalidatePath("/");
    return { success: true };
  });
}

export async function deleteAnnouncementAction(token: string, id: string) {
  let entityId: string;
  try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "announcement.delete", entityType: "announcement", entityId }, async () => {
    const client = createServerClient();
    if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("announcements").delete().eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.deleteFailed" };
    revalidatePath("/admin/announcements"); revalidatePath("/news"); revalidatePath("/friday"); revalidatePath("/");
    return { success: true };
  });
}

export async function togglePublishAnnouncementAction(token: string, id: string, published: boolean) {
  let entityId: string;
  try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "announcement.publish", entityType: "announcement", entityId, metadata: { published } }, async () => {
    const client = createServerClient();
    if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { data: result, error } = await client.from("announcements").update({ published: Boolean(published) }).eq("id", entityId).select().single();
    if (error) return { success: false, error: "admin.errors.toggleFailed" };
    if (published) await notifyUrgentAnnouncement(result as AnnouncementPushRow);
    revalidatePath("/admin/announcements"); revalidatePath("/news"); revalidatePath("/friday"); revalidatePath("/");
    return { success: true };
  });
}

export async function toggleUrgentAnnouncementAction(token: string, id: string, isUrgent: boolean) {
  let entityId: string;
  try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "announcement.urgent", entityType: "announcement", entityId, metadata: { isUrgent } }, async () => {
    const client = createServerClient();
    if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { data: result, error } = await client.from("announcements").update({ is_urgent: Boolean(isUrgent) }).eq("id", entityId).select().single();
    if (error) return { success: false, error: "admin.errors.toggleFailed" };
    if (isUrgent) await notifyUrgentAnnouncement(result as AnnouncementPushRow);
    revalidatePath("/admin/announcements"); revalidatePath("/news"); revalidatePath("/");
    return { success: true };
  });
}
