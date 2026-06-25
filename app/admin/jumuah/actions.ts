"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";

function timeRegex() {
  return /^\d{2}:\d{2}$/;
}

function validateJumuah(data: Record<string, string>) {
  const errors: string[] = [];
  if (!data.date) errors.push("Date is required");
  if (!data.khutbahTime) errors.push("Khutbah time is required");
  if (!data.prayerTime) errors.push("Prayer time is required");
  if (!data.locationName) errors.push("Location name is required");
  if (!data.locationAddress) errors.push("Location address is required");
  if (!data.language) errors.push("Language is required");

  const times = [data.khutbahTime, data.prayerTime];
  for (const t of times) {
    if (t && !timeRegex().test(t)) {
      errors.push(`Invalid time format: ${t}. Use HH:mm.`);
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

export async function createJumuahAction(
  token: string,
  data: Record<string, string>
) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "Supabase is not configured." };
  }

  const errors = validateJumuah(data);
  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  const db = {
    date: data.date,
    khutbah_time: data.khutbahTime,
    prayer_time: data.prayerTime,
    location_name: data.locationName,
    location_address: data.locationAddress,
    khateeb_name: data.khateebName,
    language: data.language,
    notes: data.notes || null,
    published: data.published === "true",
  };

  const { data: result, error } = await client.from("jumuah_times").insert(db).select().single();
  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog(email, `created Jumu'ah entry for ${data.date}`, "jumuah", String((result as Record<string, unknown>).id));
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
    return { success: false, error: "Supabase is not configured." };
  }

  const errors = validateJumuah(data);
  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  const db = {
    date: data.date,
    khutbah_time: data.khutbahTime,
    prayer_time: data.prayerTime,
    location_name: data.locationName,
    location_address: data.locationAddress,
    khateeb_name: data.khateebName,
    language: data.language,
    notes: data.notes || null,
    published: data.published === "true",
  };

  const { error } = await client.from("jumuah_times").update(db).eq("id", id).select().single();
  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog(email, `updated Jumu'ah entry for ${data.date}`, "jumuah", id);
  revalidatePath("/admin/jumuah");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}

export async function deleteJumuahAction(token: string, id: string) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "Supabase is not configured." };
  }

  const { error } = await client.from("jumuah_times").delete().eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog(email, `deleted Jumu'ah entry ${id}`, "jumuah", id);
  revalidatePath("/admin/jumuah");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}

export async function togglePublishJumuahAction(token: string, id: string, published: boolean) {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) {
    return { success: false, error: "Supabase is not configured." };
  }

  const { error } = await client.from("jumuah_times").update({ published }).eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }

  const verb = published ? "published" : "unpublished";
  await createAuditLog(email, `${verb} Jumu'ah entry ${id}`, "jumuah", id);
  revalidatePath("/admin/jumuah");
  revalidatePath("/friday");
  revalidatePath("/");
  return { success: true };
}
