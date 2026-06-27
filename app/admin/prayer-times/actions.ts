"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";

function timeRegex() {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/;
}

function validatePrayerTime(data: Record<string, string>) {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) errors.push("admin.errors.dateRequired");
  if (!data.fajr) errors.push("admin.errors.fajrRequired");
  if (!data.sunrise) errors.push("admin.errors.sunriseRequired");
  if (!data.dhuhr) errors.push("admin.errors.dhuhrRequired");
  if (!data.asr) errors.push("admin.errors.asrRequired");
  if (!data.maghrib) errors.push("admin.errors.maghribRequired");
  if (!data.isha) errors.push("admin.errors.ishaRequired");

  const times = [data.fajr, data.sunrise, data.dhuhr, data.asr, data.maghrib, data.isha];
  for (const t of times) {
    if (t && !timeRegex().test(t)) {
      errors.push("admin.errors.invalidTimeFormat");
    }
  }

  const iqamaTimes = [data.fajrIqama, data.dhuhrIqama, data.asrIqama, data.maghribIqama, data.ishaIqama];
  for (const t of iqamaTimes) {
    if (t && !timeRegex().test(t)) {
      errors.push("admin.errors.invalidIqamaTimeFormat");
    }
  }

  return errors;
}

export async function importPrayerTimesAction(token: string, rows: Record<string, string>[]) {
  const email = await requireAllowedAdmin(token);
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 366) return { success: false, error: "admin.errors.invalidCsv" };
  for (const row of rows) {
    const normalized = {
      date: row.date,
      fajr: row.fajr,
      sunrise: row.sunrise,
      dhuhr: row.dhuhr,
      asr: row.asr,
      maghrib: row.maghrib,
      isha: row.isha,
      fajrIqama: row.fajr_iqama || "",
      dhuhrIqama: row.dhuhr_iqama || "",
      asrIqama: row.asr_iqama || "",
      maghribIqama: row.maghrib_iqama || "",
      ishaIqama: row.isha_iqama || "",
      published: row.published || "true",
    };
    if (validatePrayerTime(normalized).length) return { success: false, error: "admin.errors.invalidCsv" };
  }
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
  const payload = rows.map((row) => ({
    date: row.date, fajr: row.fajr, sunrise: row.sunrise, dhuhr: row.dhuhr, asr: row.asr, maghrib: row.maghrib, isha: row.isha,
    fajr_iqama: row.fajr_iqama || null, dhuhr_iqama: row.dhuhr_iqama || null, asr_iqama: row.asr_iqama || null,
    maghrib_iqama: row.maghrib_iqama || null, isha_iqama: row.isha_iqama || null,
    note: row.note || null, published: !["false", "0", "no"].includes((row.published || "true").toLowerCase()), updated_at: new Date().toISOString(),
  }));
  const { error } = await client.from("prayer_times").upsert(payload, { onConflict: "date" });
  if (error) return { success: false, error: "admin.errors.saveFailed" };
  revalidatePath("/admin/prayer-times"); revalidatePath("/"); revalidatePath("/times");
  return { success: true, count: rows.length };
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
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const errors = validatePrayerTime(data);
  if (errors.length > 0) {
    return { success: false, error: errors[0] };
  }

  const duplicate = await checkDuplicateDate(client, data.date);
  if (duplicate) {
    return { success: false, error: "admin.errors.prayerDateExists" };
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
    return { success: false, error: "admin.errors.saveFailed" };
  }

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
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const errors = validatePrayerTime(data);
  if (errors.length > 0) {
    return { success: false, error: errors[0] };
  }

  const duplicate = await checkDuplicateDate(client, data.date, id);
  if (duplicate) {
    return { success: false, error: "admin.errors.prayerDateExists" };
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
    return { success: false, error: "admin.errors.saveFailed" };
  }

  revalidatePath("/admin/prayer-times");
  revalidatePath("/");
  revalidatePath("/times");
  return { success: true };
}

export async function deletePrayerTimeAction(token: string, id: string) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const { error } = await client.from("prayer_times").delete().eq("id", id);
  if (error) {
    return { success: false, error: "admin.errors.deleteFailed" };
  }

  revalidatePath("/admin/prayer-times");
  revalidatePath("/");
  revalidatePath("/times");
  return { success: true };
}

export async function togglePublishPrayerTimeAction(token: string, id: string, published: boolean) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const { error } = await client.from("prayer_times").update({ published }).eq("id", id);
  if (error) {
    return { success: false, error: "admin.errors.toggleFailed" };
  }

  const verb = published ? "published" : "unpublished";
  revalidatePath("/admin/prayer-times");
  revalidatePath("/");
  revalidatePath("/times");
  return { success: true };
}
