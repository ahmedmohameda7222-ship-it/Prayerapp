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

function validateMosqueSettings(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!data.mosqueName?.trim()) errors.push("Mosque name is required");
  if (!data.address?.trim()) errors.push("Address is required");
  if (data.email?.trim() && !emailRegex.test(data.email.trim())) {
    errors.push("Email must be a valid email address");
  }
  return errors;
}

export async function updateMosqueSettingsAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const errors = validateMosqueSettings(data);
  if (errors.length > 0) return { success: false, error: errors.join("; ") };

  const db: Record<string, unknown> = {
    mosque_name: data.mosqueName.trim(),
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

  const { error } = await client.from("mosque_settings").update(db).eq("id", "1");
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, "updated mosque settings", "mosque_settings");
  revalidatePath("/admin/settings");
  revalidatePath("/mosque");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}
