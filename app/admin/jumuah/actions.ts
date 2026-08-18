"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";
import { sendAdminContentPush } from "@/lib/push/web-push";
import { DEFAULT_APP_NAME } from "@/lib/app-brand";

type JumuahPushRow = {
  id: string;
  date: string;
  location_name: string | null;
  published: boolean;
};

async function notifyPublishedJumuah(row: JumuahPushRow) {
  if (!row.published) return;
  const location = row.location_name?.trim() || DEFAULT_APP_NAME;
  try {
    await sendAdminContentPush({
      // All services on the same Friday share one delivery key. Publishing a
      // second or third service cannot create duplicate Friday notifications.
      eventKey: `jumuah:${row.date}:published`,
      notificationType: "friday_announcement",
      sourceId: row.date,
      url: "/friday",
      contentTitle: {
        fallback: `${row.date} · ${location}`,
        en: `Friday prayer on ${row.date} · ${location}`,
        de: `Freitagsgebet am ${row.date} · ${location}`,
        tr: `${row.date} Cuma namazı · ${location}`,
        ar: `صلاة الجمعة ${row.date} · ${location}`,
      },
    });
  } catch (error) {
    console.error("[Friday announcement push] delivery failed", error);
  }
}

function timeRegex() {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/;
}

function validateJumuah(data: Record<string, string>) {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) errors.push("admin.errors.dateRequired");
  if (!data.prayerTime) errors.push("admin.errors.prayerTimeRequired");
  if (!data.languageAr) errors.push("admin.errors.arabicLanguageRequired");
  if (data.locationName && data.locationName.length > 160) errors.push("admin.errors.invalidInput");
  if (data.locationAddress && data.locationAddress.length > 300) errors.push("admin.errors.invalidInput");
  if (data.khateebName && data.khateebName.length > 160) errors.push("admin.errors.invalidInput");

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
  await requireAllowedAdmin(token);
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
    khutbah_time: data.khutbahTime?.trim() || null,
    prayer_time: data.prayerTime,
    location_name: data.locationName?.trim() || "",
    location_address: data.locationAddress?.trim() || "",
    khateeb_name: data.khateebName?.trim() || null,
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

  await notifyPublishedJumuah(result as JumuahPushRow);

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
  await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const errors = validateJumuah(data);
  if (errors.length > 0) {
    return { success: false, error: errors[0] };
  }

  const { data: previous } = await client
    .from("jumuah_times")
    .select("published")
    .eq("id", id)
    .maybeSingle();

  const db = {
    date: data.date,
    khutbah_time: data.khutbahTime?.trim() || null,
    prayer_time: data.prayerTime,
    location_name: data.locationName?.trim() || "",
    location_address: data.locationAddress?.trim() || "",
    khateeb_name: data.khateebName?.trim() || null,
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

  const { data: result, error } = await client.from("jumuah_times").update(db).eq("id", id).select().single();
  if (error) {
    return { success: false, error: "admin.errors.saveFailed" };
  }

  if (!previous?.published) await notifyPublishedJumuah(result as JumuahPushRow);

  revalidatePath("/admin/jumuah");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}

export async function deleteJumuahAction(token: string, id: string) {
  await requireAllowedAdmin(token);
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
  await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "admin.errors.supabaseNotConfigured" };
  }

  const { data: result, error } = await client.from("jumuah_times").update({ published }).eq("id", id).select().single();
  if (error) {
    return { success: false, error: "admin.errors.toggleFailed" };
  }

  if (published) await notifyPublishedJumuah(result as JumuahPushRow);

  revalidatePath("/admin/jumuah");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}
