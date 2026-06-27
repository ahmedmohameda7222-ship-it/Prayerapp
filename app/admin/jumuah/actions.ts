"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";

function timeRegex() {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/;
}

function validateJumuah(data: Record<string, string>) {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) errors.push("admin.errors.dateRequired");
  if (!data.khutbahTime) errors.push("admin.errors.khutbahTimeRequired");
  if (!data.prayerTime) errors.push("admin.errors.prayerTimeRequired");
  if (!data.locationName) errors.push("admin.errors.locationNameRequired");
  if (!data.locationAddress) errors.push("admin.errors.locationAddressRequired");
  if (!data.languageAr) errors.push("admin.errors.arabicLanguageRequired");
  if ((data.locationName || "").length > 160 || (data.locationAddress || "").length > 300 || (data.khateebName || "").length > 160) errors.push("admin.errors.invalidInput");

  const times = [data.khutbahTime, data.prayerTime];
  for (const t of times) {
    if (t && !timeRegex().test(t)) {
      errors.push("admin.errors.invalidTimeFormat");
    }
  }
  return errors;
}


export async function createJumuahAction(
  token: string,
  data: Record<string, string>
) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const errors = validateJumuah(data);
  if (errors.length > 0) {
    return { success: false, error: errors[0] };
  }

  const db = {
    date: data.date,
    khutbah_time: data.khutbahTime,
    prayer_time: data.prayerTime,
    location_name: data.locationName,
    location_address: data.locationAddress,
    khateeb_name: data.khateebName,
    language: data.languageAr,
    language_ar: data.languageAr,
    language_en: data.languageEn?.trim() || null,
    language_de: data.languageDe?.trim() || null,
    language_tr: data.languageTr?.trim() || null,
    notes: data.notesAr || null,
    notes_ar: data.notesAr?.trim() || null,
    notes_en: data.notesEn?.trim() || null,
    notes_de: data.notesDe?.trim() || null,
    notes_tr: data.notesTr?.trim() || null,
    published: data.published === "true",
  };

  const { data: result, error } = await client.from("jumuah_times").insert(db).select().single();
  if (error) {
    return { success: false, error: "admin.errors.saveFailed" };
  }

  revalidatePath("/admin/jumuah");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}

export async function updateJumuahAction(
  token: string,
  id: string,
  data: Record<string, string>
) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const errors = validateJumuah(data);
  if (errors.length > 0) {
    return { success: false, error: errors[0] };
  }

  const db = {
    date: data.date,
    khutbah_time: data.khutbahTime,
    prayer_time: data.prayerTime,
    location_name: data.locationName,
    location_address: data.locationAddress,
    khateeb_name: data.khateebName,
    language: data.languageAr,
    language_ar: data.languageAr,
    language_en: data.languageEn?.trim() || null,
    language_de: data.languageDe?.trim() || null,
    language_tr: data.languageTr?.trim() || null,
    notes: data.notesAr || null,
    notes_ar: data.notesAr?.trim() || null,
    notes_en: data.notesEn?.trim() || null,
    notes_de: data.notesDe?.trim() || null,
    notes_tr: data.notesTr?.trim() || null,
    published: data.published === "true",
  };

  const { error } = await client.from("jumuah_times").update(db).eq("id", id).select().single();
  if (error) {
    return { success: false, error: "admin.errors.saveFailed" };
  }

  revalidatePath("/admin/jumuah");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}

export async function deleteJumuahAction(token: string, id: string) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const { error } = await client.from("jumuah_times").delete().eq("id", id);
  if (error) {
    return { success: false, error: "admin.errors.deleteFailed" };
  }

  revalidatePath("/admin/jumuah");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}

export async function togglePublishJumuahAction(token: string, id: string, published: boolean) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const { error } = await client.from("jumuah_times").update({ published }).eq("id", id);
  if (error) {
    return { success: false, error: "admin.errors.toggleFailed" };
  }

  const verb = published ? "published" : "unpublished";
  revalidatePath("/admin/jumuah");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}
