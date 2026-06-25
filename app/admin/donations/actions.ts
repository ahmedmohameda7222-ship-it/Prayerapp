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
  if (!data.accountHolder?.trim()) errors.push("admin.errors.accountHolderRequired");
  if (!data.iban?.trim()) errors.push("admin.errors.ibanRequired");
  if (!data.bic?.trim()) errors.push("admin.errors.bicRequired");
  if (!data.defaultPurposeAr?.trim()) errors.push("admin.errors.arabicDefaultPurposeRequired");
  return errors;
}

function validateCampaign(data: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!data.titleAr?.trim()) errors.push("admin.errors.arabicTitleRequired");
  if (!data.descriptionAr?.trim()) errors.push("admin.errors.arabicDescriptionRequired");
  const target = Number(data.targetAmount);
  if (Number.isNaN(target) || target <= 0) errors.push("admin.errors.positiveTargetRequired");
  const collected = Number(data.collectedAmount);
  if (Number.isNaN(collected) || collected < 0) errors.push("admin.errors.nonNegativeCollectedRequired");
  if (!data.startDate?.trim()) errors.push("admin.errors.startDateRequired");
  if (data.endDate && data.startDate && data.endDate < data.startDate) {
    errors.push("admin.errors.endDateAfterStart");
  }
  return errors;
}

export async function updateDonationSettingsAction(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const errors = validateDonationSettings(data);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const db: Record<string, unknown> = {
    account_holder: data.accountHolder.trim(),
    iban: data.iban.trim(),
    bic: data.bic.trim(),
    paypal_link: data.paypalLink?.trim() || null,
    default_purpose: data.defaultPurposeAr.trim(),
    default_purpose_ar: data.defaultPurposeAr.trim(),
    default_purpose_en: data.defaultPurposeEn?.trim() || null,
    default_purpose_de: data.defaultPurposeDe?.trim() || null,
    default_purpose_tr: data.defaultPurposeTr?.trim() || null,
    receipt_note: data.receiptNoteAr?.trim() || "",
    receipt_note_ar: data.receiptNoteAr?.trim() || null,
    receipt_note_en: data.receiptNoteEn?.trim() || null,
    receipt_note_de: data.receiptNoteDe?.trim() || null,
    receipt_note_tr: data.receiptNoteTr?.trim() || null,
  };

  const { error } = await client.from("donation_settings").update(db).eq("id", "1");
  if (error) return { success: false, error: "admin.errors.saveFailed" };

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
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const errors = validateCampaign(data);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const db = {
    title: data.titleAr.trim(),
    title_ar: data.titleAr.trim(),
    title_en: data.titleEn?.trim() || null,
    title_de: data.titleDe?.trim() || null,
    title_tr: data.titleTr?.trim() || null,
    description: data.descriptionAr.trim(),
    description_ar: data.descriptionAr.trim(),
    description_en: data.descriptionEn?.trim() || null,
    description_de: data.descriptionDe?.trim() || null,
    description_tr: data.descriptionTr?.trim() || null,
    target_amount: Number(data.targetAmount),
    collected_amount: Number(data.collectedAmount || "0"),
    start_date: data.startDate,
    end_date: data.endDate || null,
    is_active: data.isActive === "true",
    is_featured: data.isFeatured === "true",
  };

  const { data: result, error } = await client.from("donation_campaigns").insert(db).select().single();
  if (error) return { success: false, error: "admin.errors.saveFailed" };

  await createAuditLog(email, `created donation campaign "${data.titleAr.trim()}"`, "donation_campaign", String((result as Record<string, unknown>).id));
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
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const errors = validateCampaign(data);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const db: Record<string, unknown> = {
    title: data.titleAr.trim(),
    title_ar: data.titleAr.trim(),
    title_en: data.titleEn?.trim() || null,
    title_de: data.titleDe?.trim() || null,
    title_tr: data.titleTr?.trim() || null,
    description: data.descriptionAr.trim(),
    description_ar: data.descriptionAr.trim(),
    description_en: data.descriptionEn?.trim() || null,
    description_de: data.descriptionDe?.trim() || null,
    description_tr: data.descriptionTr?.trim() || null,
    target_amount: Number(data.targetAmount),
    collected_amount: Number(data.collectedAmount || "0"),
    start_date: data.startDate,
    end_date: data.endDate || null,
    is_active: data.isActive === "true",
    is_featured: data.isFeatured === "true",
  };

  const { error } = await client.from("donation_campaigns").update(db).eq("id", id);
  if (error) return { success: false, error: "admin.errors.saveFailed" };

  await createAuditLog(email, `updated donation campaign "${data.titleAr.trim()}"`, "donation_campaign", id);
  revalidatePath("/admin/donations");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}

export async function deleteDonationCampaignAction(token: string, id: string): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const { error } = await client.from("donation_campaigns").delete().eq("id", id);
  if (error) return { success: false, error: "admin.errors.deleteFailed" };

  await createAuditLog(email, `deleted donation campaign ${id}`, "donation_campaign", id);
  revalidatePath("/admin/donations");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}

export async function toggleActiveCampaignAction(token: string, id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  const email = await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const { error } = await client.from("donation_campaigns").update({ is_active: isActive }).eq("id", id);
  if (error) return { success: false, error: "admin.errors.toggleFailed" };

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
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };

  const { error } = await client.from("donation_campaigns").update({ is_featured: isFeatured }).eq("id", id);
  if (error) return { success: false, error: "admin.errors.toggleFailed" };

  const verb = isFeatured ? "featured" : "unfeatured";
  await createAuditLog(email, `${verb} donation campaign ${id}`, "donation_campaign", id);
  revalidatePath("/admin/donations");
  revalidatePath("/donations");
  revalidatePath("/");
  return { success: true };
}
