"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { sendAdminContentPush } from "@/lib/push/web-push";
import { adminActionError, beginAdminAudit, completeAdminAudit, type AdminAuditEvent } from "@/lib/security/admin-audit";
import { parseAdminDate, parseAdminOptionalTime, parseAdminText, parseAdminTime, parseAdminUuid } from "@/lib/security/admin-input";

type ActionResult = { success: boolean; error?: string };

async function runAuditedAction(token: string, event: AdminAuditEvent, operation: () => Promise<ActionResult>): Promise<ActionResult> {
  let audit;
  try { audit = await beginAdminAudit(token, event); }
  catch (error) { return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") }; }
  let result: ActionResult;
  try { result = await operation(); } catch (error) { result = { success: false, error: adminActionError(error) }; }
  return completeAdminAudit(audit, result);
}

function parseEvent(data: Record<string, string>) {
  const startTime = parseAdminTime(data.startTime, "startTime");
  const endTime = parseAdminOptionalTime(data.endTime, "endTime");
  if (endTime && endTime <= startTime) throw new Error("admin.errors.invalidInput");
  return {
    titleAr: parseAdminText(data.titleAr, { field: "titleAr", max: 200, required: true }),
    titleEn: parseAdminText(data.titleEn ?? "", { field: "titleEn", max: 200 }),
    titleDe: parseAdminText(data.titleDe ?? "", { field: "titleDe", max: 200 }),
    titleTr: parseAdminText(data.titleTr ?? "", { field: "titleTr", max: 200 }),
    descriptionAr: parseAdminText(data.descriptionAr, { field: "descriptionAr", max: 4_000, required: true }),
    descriptionEn: parseAdminText(data.descriptionEn ?? "", { field: "descriptionEn", max: 4_000 }),
    descriptionDe: parseAdminText(data.descriptionDe ?? "", { field: "descriptionDe", max: 4_000 }),
    descriptionTr: parseAdminText(data.descriptionTr ?? "", { field: "descriptionTr", max: 4_000 }),
    locationAr: parseAdminText(data.locationAr, { field: "locationAr", max: 300, required: true }),
    locationEn: parseAdminText(data.locationEn ?? "", { field: "locationEn", max: 300 }),
    locationDe: parseAdminText(data.locationDe ?? "", { field: "locationDe", max: 300 }),
    locationTr: parseAdminText(data.locationTr ?? "", { field: "locationTr", max: 300 }),
    date: parseAdminDate(data.date, "date"),
    startTime,
    endTime,
    type: parseAdminText(data.type, { field: "type", max: 64, required: true }),
  };
}

function eventDb(parsed: ReturnType<typeof parseEvent>) {
  return {
    title: parsed.titleAr, title_ar: parsed.titleAr, title_en: parsed.titleEn || null, title_de: parsed.titleDe || null, title_tr: parsed.titleTr || null,
    description: parsed.descriptionAr, description_ar: parsed.descriptionAr, description_en: parsed.descriptionEn || null, description_de: parsed.descriptionDe || null, description_tr: parsed.descriptionTr || null,
    date: parsed.date, start_time: parsed.startTime, end_time: parsed.endTime,
    location: parsed.locationAr, location_ar: parsed.locationAr, location_en: parsed.locationEn || null, location_de: parsed.locationDe || null, location_tr: parsed.locationTr || null,
    type: parsed.type, published: true,
  };
}

export async function createEventAction(token: string, data: Record<string, string>): Promise<ActionResult> {
  return runAuditedAction(token, { action: "event.create", entityType: "event" }, async () => {
    let parsed; try { parsed = parseEvent(data); } catch (error) { return { success: false, error: adminActionError(error, "admin.errors.invalidInput") }; }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { data: result, error } = await client.from("events").insert(eventDb(parsed)).select().single();
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    try {
      await sendAdminContentPush({
        eventKey: `event:${result.id}:published`, notificationType: "event", sourceId: result.id, url: "/events",
        contentTitle: { fallback: result.title, ar: result.title_ar, en: result.title_en, de: result.title_de, tr: result.title_tr },
      });
    } catch (pushError) { console.error("[event push] delivery failed", pushError); }
    revalidatePath("/admin/events"); revalidatePath("/events"); revalidatePath("/"); return { success: true };
  });
}

export async function updateEventAction(token: string, id: string, data: Record<string, string>): Promise<ActionResult> {
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "event.update", entityType: "event", entityId }, async () => {
    let parsed; try { parsed = parseEvent(data); } catch (error) { return { success: false, error: adminActionError(error, "admin.errors.invalidInput") }; }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("events").update(eventDb(parsed)).eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    revalidatePath("/admin/events"); revalidatePath("/events"); revalidatePath("/"); return { success: true };
  });
}

export async function deleteEventAction(token: string, id: string): Promise<ActionResult> {
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "event.delete", entityType: "event", entityId }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("events").delete().eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.deleteFailed" };
    revalidatePath("/admin/events"); revalidatePath("/events"); revalidatePath("/"); return { success: true };
  });
}
