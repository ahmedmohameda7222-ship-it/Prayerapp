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

function validateDonationSettings(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!data.accountHolder?.trim()) errors.push("Account holder is required");
  if (!data.iban?.trim()) errors.push("IBAN is required");
  if (!data.bic?.trim()) errors.push("BIC is required");
  if (!data.defaultPurpose?.trim()) errors.push("Default purpose is required");
  return errors;
}

function validateCampaign(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!data.title?.trim()) errors.push("Title is required");
  const target = Number(data.targetAmount);
  if (Number.isNaN(target) || target <= 0) errors.push("Target amount must be a positive number");
  const collected = Number(data.collectedAmount);
  if (Number.isNaN(collected) || collected < 0) errors.push("Collected amount must be zero or positive");
  if (!data.startDate?.trim()) errors.push("Start date is required");
  if (data.endDate && data.startDate && data.endDate < data.startDate) {
    errors.push("End date must be after start date");
  }
  return errors;
}

export async function updateDonationSettingsAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const errors = validateDonationSettings(data);
  if (errors.length > 0) return { success: false, error: errors.join("; ") };

  const db: Record<string, unknown> = {
    account_holder: data.accountHolder.trim(),
    iban: data.iban.trim(),
    bic: data.bic.trim(),
    paypal_link: data.paypalLink?.trim() || null,
    default_purpose: data.defaultPurpose.trim(),
    receipt_note: data.receiptNote?.trim() || "",
  };

  const { error } = await client.from("donation_settings").update(db).eq("id", "1");
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, "updated donation settings", "donation_settings");
  revalidatePath("/admin/donations");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}

export async function createDonationCampaignAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const errors = validateCampaign(data);
  if (errors.length > 0) return { success: false, error: errors.join("; ") };

  const db = {
    title: data.title.trim(),
    description: data.description?.trim() || "",
    target_amount: Number(data.targetAmount),
    collected_amount: Number(data.collectedAmount || "0"),
    start_date: data.startDate,
    end_date: data.endDate || null,
    is_active: data.isActive === "true",
    is_featured: data.isFeatured === "true",
  };

  const { data: result, error } = await client.from("donation_campaigns").insert(db).select().single();
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, `created donation campaign "${data.title.trim()}"`, "donation_campaign", String((result as Record<string, unknown>).id));
  revalidatePath("/admin/donations");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}

export async function updateDonationCampaignAction(
  token: string,
  id: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const errors = validateCampaign(data);
  if (errors.length > 0) return { success: false, error: errors.join("; ") };

  const db: Record<string, unknown> = {
    title: data.title.trim(),
    description: data.description?.trim() || "",
    target_amount: Number(data.targetAmount),
    collected_amount: Number(data.collectedAmount || "0"),
    start_date: data.startDate,
    end_date: data.endDate || null,
    is_active: data.isActive === "true",
    is_featured: data.isFeatured === "true",
  };

  const { error } = await client.from("donation_campaigns").update(db).eq("id", id);
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, `updated donation campaign "${data.title.trim()}"`, "donation_campaign", id);
  revalidatePath("/admin/donations");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}

export async function deleteDonationCampaignAction(token: string, id: string): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const { error } = await client.from("donation_campaigns").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  await createAuditLog(email, `deleted donation campaign ${id}`, "donation_campaign", id);
  revalidatePath("/admin/donations");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}

export async function toggleActiveCampaignAction(token: string, id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const { error } = await client.from("donation_campaigns").update({ is_active: isActive }).eq("id", id);
  if (error) return { success: false, error: error.message };

  const verb = isActive ? "activated" : "deactivated";
  await createAuditLog(email, `${verb} donation campaign ${id}`, "donation_campaign", id);
  revalidatePath("/admin/donations");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}

export async function toggleFeaturedCampaignAction(token: string, id: string, isFeatured: boolean): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "Supabase is not configured." };

  const { error } = await client.from("donation_campaigns").update({ is_featured: isFeatured }).eq("id", id);
  if (error) return { success: false, error: error.message };

  const verb = isFeatured ? "featured" : "unfeatured";
  await createAuditLog(email, `${verb} donation campaign ${id}`, "donation_campaign", id);
  revalidatePath("/admin/donations");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}
