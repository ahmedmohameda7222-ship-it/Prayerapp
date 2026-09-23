"use server";

import { revalidatePath } from "next/cache";
import { parseDateTimeLocalInput } from "@/lib/date-utils";
import { getRuntimePrayerTimezone } from "@/lib/data/prayer-settings";
import { invalidateAnnouncementCaches } from "@/lib/data/announcements";
import { createServerClient } from "@/lib/supabase/server";
import type { AnnouncementDisplayStyle, AnnouncementType } from "@/lib/types";
import { sendAdminContentPush } from "@/lib/push/web-push";
import { validateDisplayAdminPublishableContent } from "@/lib/masjid-display/content-validation";
import { adminActionError, beginAdminAudit, completeAdminAudit, type AdminAuditEvent } from "@/lib/security/admin-audit";
import { parseAdminBoolean, parseAdminEnum, parseAdminText, parseAdminUuid } from "@/lib/security/admin-input";

const validTypes: AnnouncementType[] = ["General", "Urgent", "Location update", "Community", "Ramadan", "Eid", "Donation"];
const validDisplayStyles: AnnouncementDisplayStyle[] = ["normal", "special"];

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

async function runAuditedAction(token: string, event: AdminAuditEvent, operation: () => Promise<ActionResult>): Promise<ActionResult> {
  let audit;
  try { audit = await beginAdminAudit(token, event); }
  catch (error) { return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") }; }
  let result: ActionResult;
  try { result = await operation(); }
  catch (error) { result = { success: false, error: adminActionError(error) }; }
  return completeAdminAudit(audit, result);
}

async function notifyUrgentAnnouncement(row: AnnouncementPushRow) {
  if (!row.is_urgent || !row.published) return;
  try {
    await sendAdminContentPush({
      eventKey: `announcement:${row.id}:urgent-published`, notificationType: "urgent_announcement", sourceId: row.id, url: "/news",
      contentTitle: { fallback: row.title, ar: row.title_ar, en: row.title_en, de: row.title_de, tr: row.title_tr },
    });
  } catch (error) { console.error("[announcement push] delivery failed", error); }
}

function parseOptionalDisplayInstant(
  value: string | undefined,
  field: string,
  timezone: string,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    return parseDateTimeLocalInput(trimmed, timezone);
  } catch {
    throw new Error(`Invalid ${field}`);
  }
}

function validateAnnouncementPublishability(parsed: ReturnType<typeof parseAnnouncement>): string | null {
  return validateDisplayAdminPublishableContent("announcement", parsed)[0] ?? null;
}

function parseAnnouncement(data: Record<string, string>, timezone: string) {
  const displayFrom = parseOptionalDisplayInstant(data.displayFrom, "displayFrom", timezone);
  const displayUntil = parseOptionalDisplayInstant(data.displayUntil, "displayUntil", timezone);
  if (displayFrom && displayUntil && displayUntil <= displayFrom) throw new Error("Invalid display window");
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
    displayStyle: parseAdminEnum(data.displayStyle || "normal", "displayStyle", validDisplayStyles),
    displayFrom, displayUntil,
  };
}

function announcementDb(parsed: ReturnType<typeof parseAnnouncement>) {
  return {
    title: parsed.titleAr, title_ar: parsed.titleAr, title_en: parsed.titleEn || null, title_de: parsed.titleDe || null, title_tr: parsed.titleTr || null,
    message: parsed.messageAr, message_ar: parsed.messageAr, message_en: parsed.messageEn || null, message_de: parsed.messageDe || null, message_tr: parsed.messageTr || null,
    type: parsed.type, is_urgent: parsed.isUrgent, published: parsed.published,
    display_style: parsed.displayStyle, display_from: parsed.displayFrom, display_until: parsed.displayUntil,
  };
}

export async function createAnnouncementAction(token: string, data: Record<string, string>) {
  return runAuditedAction(token, { action: "announcement.create", entityType: "announcement", metadata: { requestedType: data.type || null } }, async () => {
    const timezone = await getRuntimePrayerTimezone();
    let parsed; try { parsed = parseAnnouncement(data, timezone); } catch (error) { return { success: false, error: adminActionError(error, "admin.errors.invalidInput") }; }
    const publishabilityError = validateAnnouncementPublishability(parsed); if (publishabilityError) return { success: false, error: publishabilityError };
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { data: result, error } = await client.from("announcements").insert(announcementDb(parsed)).select().single();
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    invalidateAnnouncementCaches();
    await notifyUrgentAnnouncement(result as AnnouncementPushRow);
    revalidatePath("/admin/announcements"); revalidatePath("/news"); revalidatePath("/friday"); revalidatePath("/");
    return { success: true };
  });
}

export async function updateAnnouncementAction(token: string, id: string, data: Record<string, string>) {
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "announcement.update", entityType: "announcement", entityId }, async () => {
    const timezone = await getRuntimePrayerTimezone();
    let parsed; try { parsed = parseAnnouncement(data, timezone); } catch (error) { return { success: false, error: adminActionError(error, "admin.errors.invalidInput") }; }
    const publishabilityError = validateAnnouncementPublishability(parsed); if (publishabilityError) return { success: false, error: publishabilityError };
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { data: previous } = await client.from("announcements").select("is_urgent, published").eq("id", entityId).maybeSingle();
    const { data: result, error } = await client.from("announcements").update(announcementDb(parsed)).eq("id", entityId).select().single();
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    invalidateAnnouncementCaches();
    if (!(previous?.is_urgent && previous?.published)) await notifyUrgentAnnouncement(result as AnnouncementPushRow);
    revalidatePath("/admin/announcements"); revalidatePath("/news"); revalidatePath("/friday"); revalidatePath("/");
    return { success: true };
  });
}

export async function deleteAnnouncementAction(token: string, id: string) {
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "announcement.delete", entityType: "announcement", entityId }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("announcements").delete().eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.deleteFailed" };
    invalidateAnnouncementCaches();
    revalidatePath("/admin/announcements"); revalidatePath("/news"); revalidatePath("/friday"); revalidatePath("/");
    return { success: true };
  });
}

export async function togglePublishAnnouncementAction(token: string, id: string, published: unknown) {
  let entityId: string; let nextPublished: boolean;
  try { entityId = parseAdminUuid(id, "id"); nextPublished = parseAdminBoolean(published, "published"); }
  catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "announcement.publish", entityType: "announcement", entityId, metadata: { published: nextPublished } }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    if (nextPublished) {
      const { data: row, error: readError } = await client.from("announcements").select("id,title,title_ar,title_en,title_de,title_tr,message_ar,message_de,is_urgent,published").eq("id", entityId).maybeSingle();
      if (readError || !row) return { success: false, error: "admin.errors.saveFailed" };
      const validationError = validateDisplayAdminPublishableContent("announcement", {
        published: true, titleAr: row.title_ar || undefined, titleDe: row.title_de || undefined, messageAr: row.message_ar || undefined, messageDe: row.message_de || undefined,
      })[0];
      if (validationError) return { success: false, error: validationError };
    }
    const { data: result, error } = await client.from("announcements").update({ published: nextPublished }).eq("id", entityId).select().single();
    if (error) return { success: false, error: "admin.errors.toggleFailed" };
    invalidateAnnouncementCaches();
    if (nextPublished) await notifyUrgentAnnouncement(result as AnnouncementPushRow);
    revalidatePath("/admin/announcements"); revalidatePath("/news"); revalidatePath("/friday"); revalidatePath("/");
    return { success: true };
  });
}

export async function toggleUrgentAnnouncementAction(token: string, id: string, isUrgent: unknown) {
  let entityId: string; let nextUrgent: boolean;
  try { entityId = parseAdminUuid(id, "id"); nextUrgent = parseAdminBoolean(isUrgent, "isUrgent"); }
  catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "announcement.urgent", entityType: "announcement", entityId, metadata: { isUrgent: nextUrgent } }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { data: result, error } = await client.from("announcements").update({ is_urgent: nextUrgent }).eq("id", entityId).select().single();
    if (error) return { success: false, error: "admin.errors.toggleFailed" };
    invalidateAnnouncementCaches();
    if (nextUrgent) await notifyUrgentAnnouncement(result as AnnouncementPushRow);
    revalidatePath("/admin/announcements"); revalidatePath("/news"); revalidatePath("/");
    return { success: true };
  });
}
