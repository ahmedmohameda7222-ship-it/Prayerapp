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
  return /^\d{2}:\d{2}$/;
}

function validateRamadanDay(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!data.date?.trim()) errors.push("Date is required");
  const ramadanDay = Number(data.ramadanDay);
  if (Number.isNaN(ramadanDay) || ramadanDay <= 0) errors.push("Ramadan day must be a positive number");
  if (!data.imsak?.trim()) errors.push("Imsak is required");
  if (!data.fajr?.trim()) errors.push("Fajr is required");
  if (!data.maghrib?.trim()) errors.push("Maghrib is required");
  if (!data.iftar?.trim()) errors.push("Iftar is required");
  const times = [data.imsak, data.fajr, data.maghrib, data.iftar, data.taraweeh];
  for (const t of times) {
    if (t && !timeRegex().test(t)) errors.push(`Invalid time format: ${t}. Use HH:mm.`);
  }
  return errors;
}

export async function createRamadanDayAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const errors = validateRamadanDay(data);
  if (errors.length > 0) return { success: false, error: errors.join("; ") };

  const db = {
    date: data.date,
    ramadan_day: Number(data.ramadanDay),
    imsak: data.imsak,
    fajr: data.fajr,
    maghrib: data.maghrib,
    iftar: data.iftar,
    taraweeh: data.taraweeh?.trim() || null,
    note: data.note?.trim() || null,
  };

  const { data: result, error } = await client.from("ramadan_days").insert(db).select().single();
  if (error) return { success: false, error: error.message };

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
  if (!client) return { success: false, error: "Supabase is not configured." };

  const errors = validateRamadanDay(data);
  if (errors.length > 0) return { success: false, error: errors.join("; ") };

  const db = {
    date: data.date,
    ramadan_day: Number(data.ramadanDay),
    imsak: data.imsak,
    fajr: data.fajr,
    maghrib: data.maghrib,
    iftar: data.iftar,
    taraweeh: data.taraweeh?.trim() || null,
    note: data.note?.trim() || null,
  };

  const { error } = await client.from("ramadan_days").update(db).eq("id", id);
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, `updated Ramadan day ${data.ramadanDay}`, "ramadan_day", id);
  revalidatePath("/admin/ramadan");
  revalidatePath("/ramadan");
  revalidatePath("/");
  return { success: true };
}

export async function deleteRamadanDayAction(token: string, id: string): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const { error } = await client.from("ramadan_days").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, `deleted Ramadan day ${id}`, "ramadan_day", id);
  revalidatePath("/admin/ramadan");
  revalidatePath("/ramadan");
  revalidatePath("/");
  return { success: true };
}
