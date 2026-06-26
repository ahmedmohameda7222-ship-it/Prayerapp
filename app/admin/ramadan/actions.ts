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

function timeRegex() {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/;
}

function validateRamadanDay(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) errors.push("admin.errors.dateRequired");
  const ramadanDay = Number(data.ramadanDay);
  if (!Number.isInteger(ramadanDay) || ramadanDay < 1 || ramadanDay > 30) errors.push("admin.errors.ramadanDayPositive");
  if (!data.imsak?.trim()) errors.push("admin.errors.imsakRequired");
  if (!data.fajr?.trim()) errors.push("admin.errors.fajrRequired");
  if (!data.maghrib?.trim()) errors.push("admin.errors.maghribRequired");
  if (!data.iftar?.trim()) errors.push("admin.errors.iftarRequired");
  const times = [data.imsak, data.fajr, data.maghrib, data.iftar, data.taraweeh];
  for (const t of times) {
    if (t && !timeRegex().test(t)) errors.push("admin.errors.invalidTimeFormat");
  }
  return errors;
}

export async function createRamadanDayAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const errors = validateRamadanDay(data);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const db = {
    date: data.date,
    ramadan_day: Number(data.ramadanDay),
    imsak: data.imsak,
    fajr: data.fajr,
    maghrib: data.maghrib,
    iftar: data.iftar,
    taraweeh: data.taraweeh?.trim() || null,
    note: data.noteAr?.trim() || null,
    note_ar: data.noteAr?.trim() || null,
    note_en: data.noteEn?.trim() || null,
    note_de: data.noteDe?.trim() || null,
    note_tr: data.noteTr?.trim() || null,
  };

  const { data: result, error } = await client.from("ramadan_days").insert(db).select().single();
  if (error) return { success: false, error: "admin.errors.saveFailed" };

  await createAuditLog(email, `created Ramadan day ${data.ramadanDay}`, "ramadan_day", String((result as Record<string, unknown>).id));
  revalidatePath("/admin/ramadan");
  revalidatePath("/ramadan");
  revalidatePath("/");
  return { success: true };
}

export async function updateRamadanDayAction(
  token: string,
  id: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const errors = validateRamadanDay(data);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const db = {
    date: data.date,
    ramadan_day: Number(data.ramadanDay),
    imsak: data.imsak,
    fajr: data.fajr,
    maghrib: data.maghrib,
    iftar: data.iftar,
    taraweeh: data.taraweeh?.trim() || null,
    note: data.noteAr?.trim() || null,
    note_ar: data.noteAr?.trim() || null,
    note_en: data.noteEn?.trim() || null,
    note_de: data.noteDe?.trim() || null,
    note_tr: data.noteTr?.trim() || null,
  };

  const { error } = await client.from("ramadan_days").update(db).eq("id", id);
  if (error) return { success: false, error: "admin.errors.saveFailed" };

  await createAuditLog(email, `updated Ramadan day ${data.ramadanDay}`, "ramadan_day", id);
  revalidatePath("/admin/ramadan");
  revalidatePath("/ramadan");
  revalidatePath("/");
  return { success: true };
}

export async function deleteRamadanDayAction(token: string, id: string): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const { error } = await client.from("ramadan_days").delete().eq("id", id);
  if (error) return { success: false, error: "admin.errors.deleteFailed" };

  await createAuditLog(email, `deleted Ramadan day ${id}`, "ramadan_day", id);
  revalidatePath("/admin/ramadan");
  revalidatePath("/ramadan");
  revalidatePath("/");
  return { success: true };
}
