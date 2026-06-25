"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";

function timeRegex() {
  return /^\d{2}:\d{2}$/;
}

function validatePrayerTime(data: Record<string, string>) {
  const errors: string[] = [];
  if (!data.date) errors.push("Date is required");
  if (!data.fajr) errors.push("Fajr is required");
  if (!data.sunrise) errors.push("Sunrise is required");
  if (!data.dhuhr) errors.push("Dhuhr is required");
  if (!data.asr) errors.push("Asr is required");
  if (!data.maghrib) errors.push("Maghrib is required");
  if (!data.isha) errors.push("Isha is required");

  const times = [data.fajr, data.sunrise, data.dhuhr, data.asr, data.maghrib, data.isha];
  for (const t of times) {
    if (t && !timeRegex().test(t)) {
      errors.push(`Invalid time format: ${t}. Use HH:mm.`);
    }
  }

  const iqamaTimes = [data.fajrIqama, data.dhuhrIqama, data.asrIqama, data.maghribIqama, data.ishaIqama];
  for (const t of iqamaTimes) {
    if (t && !timeRegex().test(t)) {
      errors.push(`Invalid iqama time format: ${t}. Use HH:mm.`);
    }
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

async function checkDuplicateDate(client: ReturnType<typeof createServerClient>, date: string, excludeId?: string) {
  if (!client) return false;
  let query = client.from("prayer_times").select("id").eq("date", date);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.limit(1).single();
  return !!data;
}

export async function createPrayerTimeAction(
  token: string,
  data: Record<string, string>
) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "Supabase is not configured." };
  }

  const errors = validatePrayerTime(data);
  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  const duplicate = await checkDuplicateDate(client, data.date);
  if (duplicate) {
    return { success: false, error: `Prayer time for ${data.date} already exists.` };
  }

  const db: Record<string, unknown> = {
    date: data.date,
    fajr: data.fajr,
    sunrise: data.sunrise,
    dhuhr: data.dhuhr,
    asr: data.asr,
    maghrib: data.maghrib,
    isha: data.isha,
    fajr_iqama: data.fajrIqama || null,
    dhuhr_iqama: data.dhuhrIqama || null,
    asr_iqama: data.asrIqama || null,
    maghrib_iqama: data.maghribIqama || null,
    isha_iqama: data.ishaIqama || null,
    note: data.note || null,
    published: data.published === "true",
  };

  const { data: result, error } = await client.from("prayer_times").insert(db).select().single();
  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog(email, `created prayer time for ${data.date}`, "prayer_time", String((result as Record<string, unknown>).id));
  revalidatePath("/admin/prayer-times");
  revalidatePath("/");
  revalidatePath("/times");
  return { success: true };
}

export async function updatePrayerTimeAction(
  token: string,
  id: string,
  data: Record<string, string>
) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "Supabase is not configured." };
  }

  const errors = validatePrayerTime(data);
  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  const duplicate = await checkDuplicateDate(client, data.date, id);
  if (duplicate) {
    return { success: false, error: `Prayer time for ${data.date} already exists.` };
  }

  const db: Record<string, unknown> = {
    date: data.date,
    fajr: data.fajr,
    sunrise: data.sunrise,
    dhuhr: data.dhuhr,
    asr: data.asr,
    maghrib: data.maghrib,
    isha: data.isha,
    fajr_iqama: data.fajrIqama || null,
    dhuhr_iqama: data.dhuhrIqama || null,
    asr_iqama: data.asrIqama || null,
    maghrib_iqama: data.maghribIqama || null,
    isha_iqama: data.ishaIqama || null,
    note: data.note || null,
    published: data.published === "true",
  };

  const { error } = await client.from("prayer_times").update(db).eq("id", id).select().single();
  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog(email, `updated prayer time for ${data.date}`, "prayer_time", id);
  revalidatePath("/admin/prayer-times");
  revalidatePath("/");
  revalidatePath("/times");
  return { success: true };
}

export async function deletePrayerTimeAction(token: string, id: string) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "Supabase is not configured." };
  }

  const { error } = await client.from("prayer_times").delete().eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog(email, `deleted prayer time ${id}`, "prayer_time", id);
  revalidatePath("/admin/prayer-times");
  revalidatePath("/");
  revalidatePath("/times");
  return { success: true };
}

export async function togglePublishPrayerTimeAction(token: string, id: string, published: boolean) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "Supabase is not configured." };
  }

  const { error } = await client.from("prayer_times").update({ published }).eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }

  const verb = published ? "published" : "unpublished";
  await createAuditLog(email, `${verb} prayer time ${id}`, "prayer_time", id);
  revalidatePath("/admin/prayer-times");
  revalidatePath("/");
  revalidatePath("/times");
  return { success: true };
}
