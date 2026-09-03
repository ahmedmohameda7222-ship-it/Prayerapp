"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { sendAdminContentPush } from "@/lib/push/web-push";
import { adminActionError, beginAdminAudit, completeAdminAudit, type AdminAuditEvent } from "@/lib/security/admin-audit";
import {
  parseAdminBoolean,
  parseAdminDate,
  parseAdminMonth,
  parseAdminNumber,
  parseAdminOptionalHttpsUrl,
  parseAdminText,
  parseAdminUuid,
} from "@/lib/security/admin-input";

type ActionResult = { success: boolean; error?: string };
type CampaignPushRow = {
  id: string;
  title: string;
  title_ar?: string | null;
  title_en?: string | null;
  title_de?: string | null;
  title_tr?: string | null;
  is_active: boolean;
};

async function runAuditedAction(token: string, event: AdminAuditEvent, operation: () => Promise<ActionResult>): Promise<ActionResult> {
  let audit;
  try { audit = await beginAdminAudit(token, event); }
  catch (error) { return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") }; }
  let result: ActionResult;
  try { result = await operation(); }
  catch (error) { result = { success: false, error: adminActionError(error) }; }
  return completeAdminAudit(audit, result);
}

async function notifyActiveCampaign(row: CampaignPushRow) {
  if (!row.is_active) return;
  try {
    await sendAdminContentPush({
      eventKey: `donation_campaign:${row.id}:active`,
      notificationType: "donation_campaign",
      sourceId: row.id,
      url: "/donations",
      contentTitle: {
        fallback: row.title,
        ar: row.title_ar,
        en: row.title_en,
        de: row.title_de,
        tr: row.title_tr,
      },
    });
  } catch (error) {
    console.error("[donation campaign push] delivery failed", error);
  }
}

function parseDonationSettings(data: Record<string, string>) {
  const accountHolder = parseAdminText(data.accountHolder, { field: "accountHolder", max: 200, required: true });
  const iban = parseAdminText(data.iban, { field: "iban", max: 64, required: true }).replace(/\s/g, "");
  const bic = parseAdminText(data.bic, { field: "bic", max: 11, required: true }).toUpperCase();
  if (!/^[A-Z]{2}[0-9A-Z]{13,32}$/u.test(iban) || !/^[A-Z0-9]{8}(?:[A-Z0-9]{3})?$/u.test(bic)) throw new Error("admin.errors.invalidInput");
  return {
    accountHolder,
    iban,
    bic,
    paypalLink: parseAdminOptionalHttpsUrl(data.paypalLink, { field: "paypalLink", max: 500 }),
    defaultPurposeAr: parseAdminText(data.defaultPurposeAr, { field: "defaultPurposeAr", max: 300, required: true }),
    defaultPurposeEn: parseAdminText(data.defaultPurposeEn ?? "", { field: "defaultPurposeEn", max: 300 }),
    defaultPurposeDe: parseAdminText(data.defaultPurposeDe ?? "", { field: "defaultPurposeDe", max: 300 }),
    defaultPurposeTr: parseAdminText(data.defaultPurposeTr ?? "", { field: "defaultPurposeTr", max: 300 }),
  };
}

function parseCampaign(data: Record<string, string>) {
  const startDate = parseAdminDate(data.startDate, "startDate");
  const endDate = data.endDate ? parseAdminDate(data.endDate, "endDate") : null;
  if (endDate && endDate < startDate) throw new Error("admin.errors.invalidInput");
  return {
    titleAr: parseAdminText(data.titleAr, { field: "titleAr", max: 200, required: true }),
    titleEn: parseAdminText(data.titleEn ?? "", { field: "titleEn", max: 200 }),
    titleDe: parseAdminText(data.titleDe ?? "", { field: "titleDe", max: 200 }),
    titleTr: parseAdminText(data.titleTr ?? "", { field: "titleTr", max: 200 }),
    descriptionAr: parseAdminText(data.descriptionAr, { field: "descriptionAr", max: 5_000, required: true }),
    descriptionEn: parseAdminText(data.descriptionEn ?? "", { field: "descriptionEn", max: 5_000 }),
    descriptionDe: parseAdminText(data.descriptionDe ?? "", { field: "descriptionDe", max: 5_000 }),
    descriptionTr: parseAdminText(data.descriptionTr ?? "", { field: "descriptionTr", max: 5_000 }),
    targetAmount: parseAdminNumber(data.targetAmount, { field: "targetAmount", min: 0.01, max: 100_000_000 }),
    collectedAmount: parseAdminNumber(data.collectedAmount || "0", { field: "collectedAmount", min: 0, max: 100_000_000 }),
    startDate,
    endDate,
    isActive: data.isActive ? parseAdminBoolean(data.isActive, "isActive") : false,
    isFeatured: data.isFeatured ? parseAdminBoolean(data.isFeatured, "isFeatured") : false,
  };
}

export async function updateDonationSettingsAction(token: string, data: Record<string, string>): Promise<ActionResult> {
  return runAuditedAction(token, { action: "donation.settings.update", entityType: "donation_settings", entityId: "1" }, async () => {
    let parsed;
    try { parsed = parseDonationSettings(data); } catch (error) { return { success: false, error: adminActionError(error, "admin.errors.invalidInput") }; }
    const client = createServerClient();
    if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const db = {
      account_holder: parsed.accountHolder, iban: parsed.iban, bic: parsed.bic, paypal_link: parsed.paypalLink,
      default_purpose: parsed.defaultPurposeAr, default_purpose_ar: parsed.defaultPurposeAr,
      default_purpose_en: parsed.defaultPurposeEn || null, default_purpose_de: parsed.defaultPurposeDe || null, default_purpose_tr: parsed.defaultPurposeTr || null,
    };
    const { error } = await client.from("donation_settings").upsert({ id: "1", ...db }, { onConflict: "id" });
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    revalidatePath("/admin/donations"); revalidatePath("/donations"); revalidatePath("/");
    return { success: true };
  });
}

export async function createDonationCampaignAction(token: string, data: Record<string, string>): Promise<ActionResult> {
  return runAuditedAction(token, { action: "donation.campaign.create", entityType: "donation_campaign" }, async () => {
    let parsed;
    try { parsed = parseCampaign(data); } catch (error) { return { success: false, error: adminActionError(error, "admin.errors.invalidInput") }; }
    const client = createServerClient();
    if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const db = {
      title: parsed.titleAr, title_ar: parsed.titleAr, title_en: parsed.titleEn || null, title_de: parsed.titleDe || null, title_tr: parsed.titleTr || null,
      description: parsed.descriptionAr, description_ar: parsed.descriptionAr, description_en: parsed.descriptionEn || null, description_de: parsed.descriptionDe || null, description_tr: parsed.descriptionTr || null,
      target_amount: parsed.targetAmount, collected_amount: parsed.collectedAmount, start_date: parsed.startDate, end_date: parsed.endDate,
      is_active: parsed.isActive, is_featured: parsed.isFeatured,
    };
    const { data: result, error } = await client.from("donation_campaigns").insert(db).select().single();
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    await notifyActiveCampaign(result as CampaignPushRow);
    revalidatePath("/admin/donations"); revalidatePath("/donations"); revalidatePath("/");
    return { success: true };
  });
}

export async function updateDonationCampaignAction(token: string, id: string, data: Record<string, string>): Promise<ActionResult> {
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "donation.campaign.update", entityType: "donation_campaign", entityId }, async () => {
    let parsed;
    try { parsed = parseCampaign(data); } catch (error) { return { success: false, error: adminActionError(error, "admin.errors.invalidInput") }; }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { data: previous } = await client.from("donation_campaigns").select("is_active").eq("id", entityId).maybeSingle();
    const db = {
      title: parsed.titleAr, title_ar: parsed.titleAr, title_en: parsed.titleEn || null, title_de: parsed.titleDe || null, title_tr: parsed.titleTr || null,
      description: parsed.descriptionAr, description_ar: parsed.descriptionAr, description_en: parsed.descriptionEn || null, description_de: parsed.descriptionDe || null, description_tr: parsed.descriptionTr || null,
      target_amount: parsed.targetAmount, collected_amount: parsed.collectedAmount, start_date: parsed.startDate, end_date: parsed.endDate,
      is_active: parsed.isActive, is_featured: parsed.isFeatured,
    };
    const { data: result, error } = await client.from("donation_campaigns").update(db).eq("id", entityId).select().single();
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    if (!previous?.is_active) await notifyActiveCampaign(result as CampaignPushRow);
    revalidatePath("/admin/donations"); revalidatePath("/donations"); revalidatePath("/"); return { success: true };
  });
}

export async function deleteDonationCampaignAction(token: string, id: string): Promise<ActionResult> {
  let entityId: string; try { entityId = parseAdminUuid(id, "id"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "donation.campaign.delete", entityType: "donation_campaign", entityId }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("donation_campaigns").delete().eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.deleteFailed" };
    revalidatePath("/admin/donations"); revalidatePath("/donations"); revalidatePath("/"); return { success: true };
  });
}

export async function toggleActiveCampaignAction(token: string, id: string, isActive: unknown): Promise<ActionResult> {
  let entityId: string; let nextActive: boolean;
  try { entityId = parseAdminUuid(id, "id"); nextActive = parseAdminBoolean(isActive, "isActive"); }
  catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "donation.campaign.active", entityType: "donation_campaign", entityId, metadata: { isActive: nextActive } }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { data: result, error } = await client.from("donation_campaigns").update({ is_active: nextActive }).eq("id", entityId).select().single();
    if (error) return { success: false, error: "admin.errors.toggleFailed" };
    if (nextActive) await notifyActiveCampaign(result as CampaignPushRow);
    revalidatePath("/admin/donations"); revalidatePath("/donations"); revalidatePath("/"); return { success: true };
  });
}

export async function toggleFeaturedCampaignAction(token: string, id: string, isFeatured: unknown): Promise<ActionResult> {
  let entityId: string; let nextFeatured: boolean;
  try { entityId = parseAdminUuid(id, "id"); nextFeatured = parseAdminBoolean(isFeatured, "isFeatured"); }
  catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "donation.campaign.featured", entityType: "donation_campaign", entityId, metadata: { isFeatured: nextFeatured } }, async () => {
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("donation_campaigns").update({ is_featured: nextFeatured }).eq("id", entityId);
    if (error) return { success: false, error: "admin.errors.toggleFailed" };
    revalidatePath("/admin/donations"); revalidatePath("/donations"); revalidatePath("/"); return { success: true };
  });
}

export async function updateDonationReportAction(token: string, data: Record<string, string>): Promise<ActionResult> {
  let month: string; try { month = parseAdminMonth(data.month, "month"); } catch { return { success: false, error: "admin.errors.invalidInput" }; }
  return runAuditedAction(token, { action: "donation.report.update", entityType: "donation_report", entityId: month }, async () => {
    let monthlyNeed: number; let donationsReceived: number;
    try {
      monthlyNeed = parseAdminNumber(data.monthlyNeed, { field: "monthlyNeed", min: 0, max: 100_000_000 });
      donationsReceived = parseAdminNumber(data.donationsReceived, { field: "donationsReceived", min: 0, max: 100_000_000 });
    } catch { return { success: false, error: "admin.errors.invalidInput" }; }
    const client = createServerClient(); if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" };
    const { error } = await client.from("donation_reports").upsert({ month, monthly_need: monthlyNeed, donations_received: donationsReceived, remaining: Math.max(0, monthlyNeed - donationsReceived) }, { onConflict: "month" });
    if (error) return { success: false, error: "admin.errors.saveFailed" };
    revalidatePath("/admin/donations"); revalidatePath("/donations"); return { success: true };
  });
}
