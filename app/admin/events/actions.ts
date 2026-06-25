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

function validateEvent(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!data.title?.trim()) errors.push("Title is required");
  if (!data.date?.trim()) errors.push("Date is required");
  if (!data.startTime?.trim()) errors.push("Start time is required");
  if (!data.location?.trim()) errors.push("Location is required");
  if (!data.type?.trim()) errors.push("Type is required");
  return errors;
}

export async function createEventAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const errors = validateEvent(data);
  if (errors.length > 0) return { success: false, error: errors.join("; ") };

  const db = {
    title: data.title.trim(),
    description: data.description?.trim() || "",
    date: data.date,
    start_time: data.startTime,
    end_time: data.endTime?.trim() || null,
    location: data.location.trim(),
    type: data.type.trim(),
  };

  const { data: result, error } = await client.from("events").insert(db).select().single();
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, `created event "${data.title.trim()}"`, "event", String((result as Record<string, unknown>).id));
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  return { success: true };
}

export async function updateEventAction(
  token: string,
  id: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const errors = validateEvent(data);
  if (errors.length > 0) return { success: false, error: errors.join("; ") };

  const db = {
    title: data.title.trim(),
    description: data.description?.trim() || "",
    date: data.date,
    start_time: data.startTime,
    end_time: data.endTime?.trim() || null,
    location: data.location.trim(),
    type: data.type.trim(),
  };

  const { error } = await client.from("events").update(db).eq("id", id);
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, `updated event "${data.title.trim()}"`, "event", id);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  return { success: true };
}

export async function deleteEventAction(token: string, id: string): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const { error } = await client.from("events").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, `deleted event ${id}`, "event", id);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  return { success: true };
}
