"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { adminActionError, beginAdminAudit, completeAdminAudit, type AdminAuditEvent } from "@/lib/security/admin-audit";
import { parseAdminDate, parseAdminNumber, parseAdminOptionalTime, parseAdminText, parseAdminTime, parseAdminUuid } from "@/lib/security/admin-input";

type ActionResult = { success: boolean; error?: string };
type ParsedRamadanDay = {
  date: string; ramadanDay: number; imsak: string; fajr: string; maghrib: string; iftar: string; taraweeh: string | null;
  noteAr: string; noteEn: string; noteDe: string; noteTr: string;
};

async function runAuditedAction(token: string, event: AdminAuditEvent, operation: () => Promise<ActionResult>): Promise<ActionResult> {
  let audit;
  try { audit = await beginAdminAudit(token, event); }
  catch (error) { return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") }; }
  let result: ActionResult;
  try { result = await operation(); } catch (error) { result = { success: false, error: adminActionError(error) }; }
  return completeAdminAudit(audit, result);
}

function parseRamadanDay(data: Record<string, string>): ParsedRamadanDay {
  return {
    date: parseAdminDate(data.date, "date"),
    ramadanDay: parseAdminNumber(data.ramadanDay, { field: "ramadanDay", min: 1, max: 30, integer: true }),
    imsak: parseAdminTime(data.imsak, "imsak"), fajr: parseAdminTime(data.fajr, "fajr"), maghrib: parseAdminTime(data.maghrib, "maghrib"), iftar: parseAdminTime(data.iftar, "iftar"),
    taraweeh: parseAdminOptionalTime(data.taraweeh, "taraweeh"),
    noteAr: parseAdminText(data.noteAr ?? "", { field: "noteAr", max: 2_000 }),
    noteEn: parseAdminText(data.noteEn ?? "", { field: "noteEn", max: 2_000 }),
    noteDe: parseAdminText(data.noteDe ?? "", { field: "noteDe", max: 2_000 }),
    noteTr: parseAdminText(data.noteTr ?? "", { field: "noteTr", max: 2_000 }),
  };
}

function ramadanDb(data: ParsedRamadanDay) {
  return {
    date: data.date, ramadan_day: data.ramadanDay, imsak: data.imsak, fajr: data.fajr, maghrib: data.maghrib, iftar: data.iftar, taraweeh: data.taraweeh,
    note: data.noteAr || null, note_ar: data.noteAr || null, note_en: data.noteEn || null, note_de: data.noteDe || null, note_tr: data.noteTr || null, published: true,
  };
}

function revalidateRamadan() { revalidatePath("/admin/ramadan"); revalidatePath("/ramadan"); revalidatePath("/"); }

export async function createRamadanDayAction(token: string, data: Record<string, string>): Promise<ActionResult> {
  return runAuditedAction(token, { action: "ramadan_day.create", entityType: "ramadan_day" }, async () => {
    let parsed: ParsedRamadanDay; try { parsed = parseRamadanDay(data); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("ramadan_days").insert(ramadanDb(parsed)).select().single();
    if (error) return { success: false, error: "admin.errors.saveFailed" }; revalidateRamadan(); return { success: true };
  });
}

export async function updateRamadanDayAction(token: string, id: string, data: Record<string, string>): Promise<ActionResult> {
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "ramadan_day.update", entityType: "ramadan_day", entityId }, async () => {
    let parsed: ParsedRamadanDay; try { parsed = parseRamadanDay(data); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("ramadan_days").update(ramadanDb(parsed)).eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.saveFailed" }; revalidateRamadan(); return { success: true };
  });
}

export async function deleteRamadanDayAction(token: string, id: string): Promise<ActionResult> {
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "ramadan_day.delete", entityType: "ramadan_day", entityId }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("ramadan_days").delete().eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.deleteFailed" }; revalidateRamadan(); return { success: true };
  });
}
