"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";
import { sendAdminContentPush } from "@/lib/push/web-push";
import { DEFAULT_APP_NAME } from "@/lib/app-brand";
import { validateAdditionalJumuah, type AdditionalJumuahValidationError } from "@/lib/admin-jumuah-validation";

type JumuahPushRow = {
  id: string;
  date: string;
  location_name: string | null;
  published: boolean;
};

type ServerClient = NonNullable<ReturnType<typeof createServerClient>>;

async function notifyPublishedJumuah(row: JumuahPushRow) {
  if (!row.published) return;
  const location = row.location_name?.trim() || DEFAULT_APP_NAME;
  try {
    await sendAdminContentPush({
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

function validateMetadata(data: Record<string, string>) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) return "admin.errors.dateRequired";
  if (!data.prayerTime) return "admin.errors.prayerTimeRequired";
  if (data.locationName && data.locationName.length > 160) return "admin.errors.invalidInput";
  if (data.locationAddress && data.locationAddress.length > 300) return "admin.errors.invalidInput";
  if (data.khateebName && data.khateebName.length > 160) return "admin.errors.invalidInput";
  return null;
}

function validationErrorKey(error: AdditionalJumuahValidationError) {
  if (error === "invalid-date") return "admin.errors.dateRequired";
  if (error === "invalid-time") return "admin.errors.invalidTimeFormat";
  return "admin.errors.invalidInput";
}

function isPrimaryServiceId(id: string) {
  return id.startsWith("primary:");
}

async function validateAgainstPrimary(
  client: ServerClient,
  data: Record<string, string>,
  editingId?: string,
) {
  const metadataError = validateMetadata(data);
  if (metadataError) return metadataError;

  const [{ data: primary, error: primaryError }, { data: existing, error: existingError }] = await Promise.all([
    client.from("prayer_times").select("id,date,dhuhr").eq("date", data.date).maybeSingle(),
    client.from("jumuah_times").select("id,prayer_time").eq("date", data.date),
  ]);

  if (primaryError || existingError) return "admin.errors.saveFailed";

  const authorityError = validateAdditionalJumuah({
    date: data.date,
    prayerTime: data.prayerTime,
    primaryPrayer: primary
      ? { id: String(primary.id), date: String(primary.date), dhuhr: String(primary.dhuhr) }
      : undefined,
    existing: (existing || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      prayerTime: String(row.prayer_time),
    })),
    editingId,
  });

  return authorityError ? validationErrorKey(authorityError) : null;
}

function toAdditionalDb(data: Record<string, string>) {
  const languageAr = data.languageAr?.trim() || "";
  return {
    date: data.date,
    khutbah_time: null,
    prayer_time: data.prayerTime,
    location_name: data.locationName?.trim() || "",
    location_address: data.locationAddress?.trim() || "",
    khateeb_name: data.khateebName?.trim() || "",
    language: languageAr,
    language_ar: languageAr || null,
    language_en: data.languageEn?.trim() || null,
    language_de: data.languageDe?.trim() || null,
    language_tr: data.languageTr?.trim() || null,
    notes: data.notesAr?.trim() || null,
    notes_ar: data.notesAr?.trim() || null,
    notes_en: data.notesEn?.trim() || null,
    notes_de: data.notesDe?.trim() || null,
    notes_tr: data.notesTr?.trim() || null,
    published: data.published === "true",
  };
}

function revalidateFridaySurfaces() {
  revalidatePath("/admin/jumuah");
  revalidatePath("/friday");
  revalidatePath("/");
}

export async function createJumuahAction(token: string, data: Record<string, string>) {
  await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const validationError = await validateAgainstPrimary(client, data);
  if (validationError) return { success: false, error: validationError };

  const { data: result, error } = await client.from("jumuah_times").insert(toAdditionalDb(data)).select().single();
  if (error || !result) return { success: false, error: "admin.errors.saveFailed" };

  await notifyPublishedJumuah(result as JumuahPushRow);
  revalidateFridaySurfaces();
  return { success: true };
}

export async function updateJumuahAction(token: string, id: string, data: Record<string, string>) {
  await requireAllowedAdmin(token);
  if (isPrimaryServiceId(id)) return { success: false, error: "admin.errors.invalidInput" };
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const validationError = await validateAgainstPrimary(client, data, id);
  if (validationError) return { success: false, error: validationError };

  const { data: previous } = await client.from("jumuah_times").select("published").eq("id", id).maybeSingle();
  const { data: result, error } = await client
    .from("jumuah_times")
    .update(toAdditionalDb(data))
    .eq("id", id)
    .select()
    .single();
  if (error || !result) return { success: false, error: "admin.errors.saveFailed" };

  if (!previous?.published) await notifyPublishedJumuah(result as JumuahPushRow);
  revalidateFridaySurfaces();
  return { success: true };
}

export async function deleteJumuahAction(token: string, id: string) {
  await requireAllowedAdmin(token);
  if (isPrimaryServiceId(id)) return { success: false, error: "admin.errors.invalidInput" };
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const { error } = await client.from("jumuah_times").delete().eq("id", id);
  if (error) return { success: false, error: "admin.errors.deleteFailed" };

  revalidateFridaySurfaces();
  return { success: true };
}

export async function togglePublishJumuahAction(token: string, id: string, published: boolean) {
  await requireAllowedAdmin(token);
  if (isPrimaryServiceId(id)) return { success: false, error: "admin.errors.invalidInput" };
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const { data: result, error } = await client
    .from("jumuah_times")
    .update({ published })
    .eq("id", id)
    .select()
    .single();
  if (error || !result) return { success: false, error: "admin.errors.toggleFailed" };

  if (published) await notifyPublishedJumuah(result as JumuahPushRow);
  revalidateFridaySurfaces();
  return { success: true };
}
