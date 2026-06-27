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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex = /^https:\/\//i;

function validateMosqueSettings(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!data.mosqueNameAr?.trim()) errors.push("admin.errors.arabicMosqueNameRequired");
  if (!data.address?.trim()) errors.push("admin.errors.addressRequired");
  if (data.email?.trim() && !emailRegex.test(data.email.trim())) {
    errors.push("admin.errors.validEmailRequired");
  }
  for (const value of [data.googleMapsLink, data.whatsappLink, data.telegramLink]) {
    if (value?.trim() && !urlRegex.test(value.trim())) errors.push("admin.errors.validHttpsUrlRequired");
  }
  if (data.phone?.length > 40 || data.address?.length > 300) errors.push("admin.errors.invalidInput");
  return errors;
}

export async function updateMosqueSettingsAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const errors = validateMosqueSettings(data);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const db: Record<string, unknown> = {
    mosque_name: data.mosqueNameAr.trim(),
    mosque_name_ar: data.mosqueNameAr.trim(),
    mosque_name_en: data.mosqueNameEn?.trim() || null,
    mosque_name_de: data.mosqueNameDe?.trim() || null,
    mosque_name_tr: data.mosqueNameTr?.trim() || null,
    address: data.address.trim(),
    phone: data.phone?.trim() || "",
    email: data.email?.trim() || "",
    google_maps_link: data.googleMapsLink?.trim() || "",
    whatsapp_link: data.whatsappLink?.trim() || "",
    telegram_link: data.telegramLink?.trim() || "",
    account_holder: data.accountHolder?.trim() || "",
    iban: data.iban?.trim() || "",
    bic: data.bic?.trim() || "",
  };

  const { error } = await client.from("mosque_settings").upsert({ id: "1", ...db }, { onConflict: "id" });
  if (error) return { success: false, error: "admin.errors.saveFailed" };

  await createAuditLog(email, "updated mosque settings", "mosque_settings");
  revalidatePath("/admin/settings");
  revalidatePath("/mosque");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}
