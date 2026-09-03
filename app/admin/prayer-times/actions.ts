"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { invalidateCachePrefix } from "@/lib/data/cache";
import { adminActionError, beginAdminAudit, completeAdminAudit, type AdminAuditEvent } from "@/lib/security/admin-audit";
import {
  parseAdminBoolean,
  parseAdminDate,
  parseAdminNumber,
  parseAdminOptionalTime,
  parseAdminText,
  parseAdminTime,
  parseAdminUuid,
} from "@/lib/security/admin-input";

type ActionResult = { success: boolean; error?: string; count?: number };
type ParsedPrayerTime = {
  date: string; fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string;
  fajrIqama: string | null; dhuhrIqama: string | null; asrIqama: string | null; maghribIqama: string | null; ishaIqama: string | null;
  maghribProgramEnabled: boolean; maghribLessonTitle: string | null; maghribLessonDurationMinutes: number | null;
  maghribCombinedIshaTime: string | null; note: string | null; published: boolean;
};

async function runAuditedAction(token: string, event: AdminAuditEvent, operation: () => Promise<ActionResult>): Promise<ActionResult> {
  let audit;
  try { audit = await beginAdminAudit(token, event); }
  catch (error) { return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") }; }
  let result: ActionResult;
  try { result = await operation(); } catch (error) { result = { success: false, error: adminActionError(error) }; }
  return completeAdminAudit(audit, result);
}

function parsePrayerTime(data: Record<string, string>): ParsedPrayerTime {
  const duration = data.maghribLessonDurationMinutes
    ? parseAdminNumber(data.maghribLessonDurationMinutes, { field: "maghribLessonDurationMinutes", min: 1, max: 240, integer: true })
    : null;
  return {
    date: parseAdminDate(data.date, "date"),
    fajr: parseAdminTime(data.fajr, "fajr"), sunrise: parseAdminTime(data.sunrise, "sunrise"), dhuhr: parseAdminTime(data.dhuhr, "dhuhr"),
    asr: parseAdminTime(data.asr, "asr"), maghrib: parseAdminTime(data.maghrib, "maghrib"), isha: parseAdminTime(data.isha, "isha"),
    fajrIqama: parseAdminOptionalTime(data.fajrIqama, "fajrIqama"), dhuhrIqama: parseAdminOptionalTime(data.dhuhrIqama, "dhuhrIqama"),
    asrIqama: parseAdminOptionalTime(data.asrIqama, "asrIqama"), maghribIqama: parseAdminOptionalTime(data.maghribIqama, "maghribIqama"),
    ishaIqama: parseAdminOptionalTime(data.ishaIqama, "ishaIqama"),
    maghribProgramEnabled: data.maghribProgramEnabled ? parseAdminBoolean(data.maghribProgramEnabled, "maghribProgramEnabled") : false,
    maghribLessonTitle: data.maghribLessonTitle ? parseAdminText(data.maghribLessonTitle, { field: "maghribLessonTitle", max: 160 }) || null : null,
    maghribLessonDurationMinutes: duration,
    maghribCombinedIshaTime: parseAdminOptionalTime(data.maghribCombinedIshaTime, "maghribCombinedIshaTime"),
    note: data.note ? parseAdminText(data.note, { field: "note", max: 2_000 }) || null : null,
    published: data.published ? parseAdminBoolean(data.published, "published") : false,
  };
}

function prayerDb(data: ParsedPrayerTime): Record<string, unknown> {
  return {
    date: data.date, fajr: data.fajr, sunrise: data.sunrise, dhuhr: data.dhuhr, asr: data.asr, maghrib: data.maghrib, isha: data.isha,
    fajr_iqama: data.fajrIqama, dhuhr_iqama: data.dhuhrIqama, asr_iqama: data.asrIqama, maghrib_iqama: data.maghribIqama, isha_iqama: data.ishaIqama,
    maghrib_program_enabled: data.maghribProgramEnabled, maghrib_lesson_title: data.maghribLessonTitle,
    maghrib_lesson_duration_minutes: data.maghribLessonDurationMinutes, maghrib_combined_isha_time: data.maghribCombinedIshaTime,
    note: data.note, published: data.published,
  };
}

function revalidatePrayerSurfaces() {
  invalidateCachePrefix("prayer_times"); revalidatePath("/admin/prayer-times"); revalidatePath("/"); revalidatePath("/times");
}

async function checkDuplicateDate(client: ReturnType<typeof createServerClient>, date: string, excludeId?: string) {
  if (!client) return false;
  let query = client.from("prayer_times").select("id").eq("date", date);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.limit(1).maybeSingle();
  return Boolean(data);
}

export async function importPrayerTimesAction(token: string, rows: Record<string, string>[]): Promise<ActionResult> {
  return runAuditedAction(token, { action: "prayer_times.import", entityType: "prayer_time", entityId: "batch", metadata: { rowCount: Array.isArray(rows) ? rows.length : 0 } }, async () => {
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 366) return { success: false, error: "admin.errors.invalidCsv" };
    const payload: Record<string, unknown>[] = [];
    for (const row of rows) {
      try {
        const parsed = parsePrayerTime({
          date: row.date, fajr: row.fajr, sunrise: row.sunrise, dhuhr: row.dhuhr, asr: row.asr, maghrib: row.maghrib, isha: row.isha,
          fajrIqama: row.fajr_iqama || "", dhuhrIqama: row.dhuhr_iqama || "", asrIqama: row.asr_iqama || "",
          maghribIqama: row.maghrib_iqama || "", ishaIqama: row.isha_iqama || "", note: row.note || "",
          published: ["false", "0", "no"].includes((row.published || "true").toLowerCase()) ? "false" : "true",
        });
        payload.push({ ...prayerDb(parsed), updated_at: new Date().toISOString() });
      } catch { return { success: false, error: "admin.errors.invalidCsv" }; }
    }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("prayer_times").upsert(payload, { onConflict: "date" });
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    revalidatePrayerSurfaces(); return { success: true, count: rows.length };
  });
}

export async function createPrayerTimeAction(token: string, data: Record<string, string>): Promise<ActionResult> {
  return runAuditedAction(token, { action: "prayer_time.create", entityType: "prayer_time" }, async () => {
    let parsed: ParsedPrayerTime; try { parsed = parsePrayerTime(data); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    if (await checkDuplicateDate(client, parsed.date)) return { success: false, error: "admin.errors.prayerDateExists" };
    const { error } = await client.from("prayer_times").insert(prayerDb(parsed)).select().single();
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    revalidatePrayerSurfaces(); return { success: true };
  });
}

export async function updatePrayerTimeAction(token: string, id: string, data: Record<string, string>): Promise<ActionResult> {
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "prayer_time.update", entityType: "prayer_time", entityId }, async () => {
    let parsed: ParsedPrayerTime; try { parsed = parsePrayerTime(data); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    if (await checkDuplicateDate(client, parsed.date, entityId)) return { success: false, error: "admin.errors.prayerDateExists" };
    const { error } = await client.from("prayer_times").update(prayerDb(parsed)).eq("id", entityId).select().single();
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    revalidatePrayerSurfaces(); return { success: true };
  });
}

export async function deletePrayerTimeAction(token: string, id: string): Promise<ActionResult> {
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "prayer_time.delete", entityType: "prayer_time", entityId }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("prayer_times").delete().eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.deleteFailed" };
    revalidatePrayerSurfaces(); return { success: true };
  });
}

export async function togglePublishPrayerTimeAction(token: string, id: string, published: unknown): Promise<ActionResult> {
  let entityId: string; let nextPublished: boolean;
  try { entityId = parseAdminUuid(id, "id"); nextPublished = parseAdminBoolean(published, "published"); }
  catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "prayer_time.publish", entityType: "prayer_time", entityId, metadata: { published: nextPublished } }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("prayer_times").update({ published: nextPublished }).eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.toggleFailed" };
    revalidatePrayerSurfaces(); return { success: true };
  });
}
