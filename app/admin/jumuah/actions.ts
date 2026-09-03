"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { sendAdminContentPush } from "@/lib/push/web-push";
import { DEFAULT_APP_NAME } from "@/lib/app-brand";
import { validateAdditionalJumuah, type AdditionalJumuahValidationError } from "@/lib/admin-jumuah-validation";
import { adminActionError, beginAdminAudit, completeAdminAudit, type AdminAuditEvent } from "@/lib/security/admin-audit";
import { parseAdminBoolean, parseAdminDate, parseAdminText, parseAdminTime, parseAdminUuid } from "@/lib/security/admin-input";

type ActionResult = { success: boolean; error?: string };
type JumuahPushRow = { id: string; date: string; location_name: string | null; published: boolean };
type ServerClient = NonNullable<ReturnType<typeof createServerClient>>;

type ParsedJumuah = {
  date: string; prayerTime: string; locationName: string; locationAddress: string; khateebName: string;
  languageAr: string; languageEn: string; languageDe: string; languageTr: string;
  notesAr: string; notesEn: string; notesDe: string; notesTr: string; published: boolean;
};

async function runAuditedAction(token: string, event: AdminAuditEvent, operation: () => Promise<ActionResult>): Promise<ActionResult> {
  let audit;
  try { audit = await beginAdminAudit(token, event); }
  catch (error) { return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") }; }
  let result: ActionResult;
  try { result = await operation(); } catch (error) { result = { success: false, error: adminActionError(error) }; }
  return completeAdminAudit(audit, result);
}

async function notifyPublishedJumuah(row: JumuahPushRow) {
  if (!row.published) return;
  const location = row.location_name?.trim() || DEFAULT_APP_NAME;
  try {
    await sendAdminContentPush({
      eventKey: `jumuah:${row.date}:published`, notificationType: "friday_announcement", sourceId: row.date, url: "/friday",
      contentTitle: {
        fallback: `${row.date} · ${location}`,
        en: `Friday prayer on ${row.date} · ${location}`,
        de: `Freitagsgebet am ${row.date} · ${location}`,
        tr: `${row.date} Cuma namazı · ${location}`,
        ar: `صلاة الجمعة ${row.date} · ${location}`,
      },
    });
  } catch (error) { console.error("[Friday announcement push] delivery failed", error); }
}

function parseJumuah(data: Record<string, string>): ParsedJumuah {
  return {
    date: parseAdminDate(data.date, "date"),
    prayerTime: parseAdminTime(data.prayerTime, "prayerTime"),
    locationName: parseAdminText(data.locationName ?? "", { field: "locationName", max: 160 }),
    locationAddress: parseAdminText(data.locationAddress ?? "", { field: "locationAddress", max: 300 }),
    khateebName: parseAdminText(data.khateebName ?? "", { field: "khateebName", max: 160 }),
    languageAr: parseAdminText(data.languageAr ?? "", { field: "languageAr", max: 80 }),
    languageEn: parseAdminText(data.languageEn ?? "", { field: "languageEn", max: 80 }),
    languageDe: parseAdminText(data.languageDe ?? "", { field: "languageDe", max: 80 }),
    languageTr: parseAdminText(data.languageTr ?? "", { field: "languageTr", max: 80 }),
    notesAr: parseAdminText(data.notesAr ?? "", { field: "notesAr", max: 2_000 }),
    notesEn: parseAdminText(data.notesEn ?? "", { field: "notesEn", max: 2_000 }),
    notesDe: parseAdminText(data.notesDe ?? "", { field: "notesDe", max: 2_000 }),
    notesTr: parseAdminText(data.notesTr ?? "", { field: "notesTr", max: 2_000 }),
    published: data.published ? parseAdminBoolean(data.published, "published") : false,
  };
}

function validationErrorKey(error: AdditionalJumuahValidationError) {
  if (error === "invalid-date") return "admin.errors.dateRequired";
  if (error === "invalid-time") return "admin.errors.invalidTimeFormat";
  return "admin.errors.invalidInput";
}

function isPrimaryServiceId(id: string) { return id.startsWith("primary:"); }

async function validateAgainstPrimary(client: ServerClient, data: ParsedJumuah, editingId?: string) {
  const [{ data: primary, error: primaryError }, { data: existing, error: existingError }] = await Promise.all([
    client.from("prayer_times").select("date,dhuhr").eq("date", data.date).maybeSingle(),
    client.from("jumuah_times").select("id,prayer_time").eq("date", data.date),
  ]);
  if (primaryError || existingError) return "admin.errors.saveFailed";
  const authorityError = validateAdditionalJumuah({
    date: data.date,
    prayerTime: data.prayerTime,
    primaryPrayer: primary ? { date: String(primary.date), dhuhr: String(primary.dhuhr) } : undefined,
    existing: (existing || []).map((row: Record<string, unknown>) => ({ id: String(row.id), prayerTime: String(row.prayer_time) })),
    editingId,
  });
  return authorityError ? validationErrorKey(authorityError) : null;
}

function toAdditionalDb(data: ParsedJumuah) {
  return {
    date: data.date, khutbah_time: null, prayer_time: data.prayerTime,
    location_name: data.locationName, location_address: data.locationAddress, khateeb_name: data.khateebName,
    language: data.languageAr, language_ar: data.languageAr || null, language_en: data.languageEn || null,
    language_de: data.languageDe || null, language_tr: data.languageTr || null,
    notes: data.notesAr || null, notes_ar: data.notesAr || null, notes_en: data.notesEn || null,
    notes_de: data.notesDe || null, notes_tr: data.notesTr || null, published: data.published,
  };
}

function revalidateFridaySurfaces() { revalidatePath("/admin/jumuah"); revalidatePath("/friday"); revalidatePath("/"); }

export async function createJumuahAction(token: string, data: Record<string, string>): Promise<ActionResult> {
  return runAuditedAction(token, { action: "jumuah.create", entityType: "jumuah_service" }, async () => {
    let parsed: ParsedJumuah; try { parsed = parseJumuah(data); } catch (error) { return { success: false, error: adminActionError(error, "admin.errors.invalidInput") }; }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const validationError = await validateAgainstPrimary(client, parsed); if (validationError) return { success: false, error: validationError };
    const { data: result, error } = await client.from("jumuah_times").insert(toAdditionalDb(parsed)).select().single();
    if (error || !result) return { success: false, error: "admin.errors.saveFailed" };
    await notifyPublishedJumuah(result as JumuahPushRow); revalidateFridaySurfaces(); return { success: true };
  });
}

export async function updateJumuahAction(token: string, id: string, data: Record<string, string>): Promise<ActionResult> {
  if (isPrimaryServiceId(id)) return { success: false, error: "admin.errors.invalidInput" };
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "jumuah.update", entityType: "jumuah_service", entityId }, async () => {
    let parsed: ParsedJumuah; try { parsed = parseJumuah(data); } catch (error) { return { success: false, error: adminActionError(error, "admin.errors.invalidInput") }; }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const validationError = await validateAgainstPrimary(client, parsed, entityId); if (validationError) return { success: false, error: validationError };
    const { data: previous } = await client.from("jumuah_times").select("published").eq("id", entityId).maybeSingle();
    const { data: result, error } = await client.from("jumuah_times").update(toAdditionalDb(parsed)).eq("id", entityId).select().single();
    if (error || !result) return { success: false, error: "admin.errors.saveFailed" };
    if (!previous?.published) await notifyPublishedJumuah(result as JumuahPushRow); revalidateFridaySurfaces(); return { success: true };
  });
}

export async function deleteJumuahAction(token: string, id: string): Promise<ActionResult> {
  if (isPrimaryServiceId(id)) return { success: false, error: "admin.errors.invalidInput" };
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "jumuah.delete", entityType: "jumuah_service", entityId }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("jumuah_times").delete().eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.deleteFailed" }; revalidateFridaySurfaces(); return { success: true };
  });
}

export async function togglePublishJumuahAction(token: string, id: string, published: unknown): Promise<ActionResult> {
  if (isPrimaryServiceId(id)) return { success: false, error: "admin.errors.invalidInput" };
  let entityId: string; let nextPublished: boolean;
  try { entityId = parseAdminUuid(id, "id"); nextPublished = parseAdminBoolean(published, "published"); }
  catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "jumuah.publish", entityType: "jumuah_service", entityId, metadata: { published: nextPublished } }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { data: result, error } = await client.from("jumuah_times").update({ published: nextPublished }).eq("id", entityId).select().single();
    if (error || !result) return { success: false, error: "admin.errors.toggleFailed" };
    if (nextPublished) await notifyPublishedJumuah(result as JumuahPushRow); revalidateFridaySurfaces(); return { success: true };
  });
}
