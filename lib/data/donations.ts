import { createClient } from "@/lib/supabase/client";
import type { DonationSettings, DonationCampaign, Donation, DonationReport } from "@/lib/types";
import { localizedFieldsFromDb, localizedFieldsToDb, readDbString } from "./localized-db";

export async function getDonationSettings(): Promise<DonationSettings> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("donation_settings").select("*").single();
  if (error || !data) throw new Error("Unable to load donation settings");
  return {
    accountHolder: String(data.account_holder),
    iban: String(data.iban),
    bic: String(data.bic),
    paypalLink: data.paypal_link ? String(data.paypal_link) : undefined,
    defaultPurpose: readDbString(data as Record<string, unknown>, "default_purpose"),
    receiptNote: readDbString(data as Record<string, unknown>, "receipt_note"),
    ...localizedFieldsFromDb(data as Record<string, unknown>, "defaultPurpose", "default_purpose"),
    ...localizedFieldsFromDb(data as Record<string, unknown>, "receiptNote", "receipt_note"),
  };
}

export async function updateDonationSettings(settings: Partial<DonationSettings>): Promise<DonationSettings> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const db: Record<string, unknown> = {};
  if (settings.accountHolder) db.account_holder = settings.accountHolder;
  if (settings.iban) db.iban = settings.iban;
  if (settings.bic) db.bic = settings.bic;
  if (settings.paypalLink !== undefined) db.paypal_link = settings.paypalLink;
  Object.assign(db, localizedFieldsToDb(settings as Record<string, unknown>, "defaultPurpose", "default_purpose", { includeLegacy: true }));
  Object.assign(db, localizedFieldsToDb(settings as Record<string, unknown>, "receiptNote", "receipt_note", { includeLegacy: true }));
  if (settings.defaultPurpose) db.default_purpose = settings.defaultPurposeAr || settings.defaultPurpose;
  if (settings.receiptNote) db.receipt_note = settings.receiptNoteAr || settings.receiptNote;
  const { data, error } = await client.from("donation_settings").upsert({ id: "1", ...db }, { onConflict: "id" }).select().single();
  if (error || !data) throw new Error("Unable to update donation settings");
  return getDonationSettings();
}

export async function getDonationCampaigns(includeInactive = false): Promise<DonationCampaign[]> {
  const client = createClient();
  if (!client) return [];
  let query = client
    .from("donation_campaigns")
    .select("*")
    .order("end_date", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error || !data) throw new Error("Unable to load donation campaigns");
  return data.map((row: unknown) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      title: readDbString(record, "title"),
      description: readDbString(record, "description"),
      targetAmount: Number(record.target_amount),
      collectedAmount: Number(record.collected_amount),
      startDate: String(record.start_date),
      endDate: String(record.end_date),
      isActive: Boolean(record.is_active),
      isFeatured: Boolean(record.is_featured),
      ...localizedFieldsFromDb(record, "title", "title"),
      ...localizedFieldsFromDb(record, "description", "description"),
    };
  });
}

export async function createDonationCampaign(item: Omit<DonationCampaign, "id">): Promise<DonationCampaign> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const db = {
    ...localizedFieldsToDb(item as unknown as Record<string, unknown>, "title", "title", { includeLegacy: true }),
    ...localizedFieldsToDb(item as unknown as Record<string, unknown>, "description", "description", { includeLegacy: true }),
    title: item.titleAr || item.title,
    description: item.descriptionAr || item.description,
    target_amount: item.targetAmount,
    collected_amount: item.collectedAmount,
    start_date: item.startDate,
    end_date: item.endDate,
    is_active: item.isActive,
    is_featured: item.isFeatured,
  };
  const { data, error } = await client.from("donation_campaigns").insert(db).select().single();
  if (error || !data) throw new Error("Failed to create campaign");
  return { ...item, id: String((data as Record<string, unknown>).id) };
}

export async function updateDonationCampaign(id: string, item: Partial<DonationCampaign>): Promise<DonationCampaign> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const db: Record<string, unknown> = {};
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "title", "title", { includeLegacy: true }));
  Object.assign(db, localizedFieldsToDb(item as unknown as Record<string, unknown>, "description", "description", { includeLegacy: true }));
  if (item.title) db.title = item.titleAr || item.title;
  if (item.description) db.description = item.descriptionAr || item.description;
  if (item.targetAmount !== undefined) db.target_amount = item.targetAmount;
  if (item.collectedAmount !== undefined) db.collected_amount = item.collectedAmount;
  if (item.startDate) db.start_date = item.startDate;
  if (item.endDate) db.end_date = item.endDate;
  if (item.isActive !== undefined) db.is_active = item.isActive;
  if (item.isFeatured !== undefined) db.is_featured = item.isFeatured;
  const { data, error } = await client.from("donation_campaigns").update(db).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update campaign");
  return { ...item, id: String((data as Record<string, unknown>).id) } as DonationCampaign;
}

export async function deleteDonationCampaign(id: string): Promise<void> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { error } = await client.from("donation_campaigns").delete().eq("id", id);
  if (error) throw new Error("Failed to delete campaign");
}

export async function getDonations(): Promise<Donation[]> {
  const client = createClient();
  if (!client) return [];
  const { data, error } = await client.from("donations").select("*").order("received_at", { ascending: false });
  if (error || !data) throw new Error("Unable to load donations");
  return data.map((row: unknown) => ({
    id: String((row as Record<string, unknown>).id),
    amount: Number((row as Record<string, unknown>).amount),
    purpose: String((row as Record<string, unknown>).purpose),
    donorName: (row as Record<string, unknown>).donor_name ? String((row as Record<string, unknown>).donor_name) : undefined,
    receivedAt: String((row as Record<string, unknown>).received_at),
    method: String((row as Record<string, unknown>).method) as Donation["method"],
  }));
}

export async function getDonationReport(): Promise<DonationReport> {
  const client = createClient();
  if (!client) return { month: new Date().toISOString().slice(0, 7), monthlyNeed: 0, donationsReceived: 0, remaining: 0 };
  const { data, error } = await client.from("donation_reports").select("*").order("month", { ascending: false }).limit(1).single();
  if (error || !data) {
    if (error?.code === "PGRST116") return { month: new Date().toISOString().slice(0, 7), monthlyNeed: 0, donationsReceived: 0, remaining: 0 };
    throw new Error("Unable to load donation report");
  }
  return {
    month: String((data as Record<string, unknown>).month),
    monthlyNeed: Number((data as Record<string, unknown>).monthly_need),
    donationsReceived: Number((data as Record<string, unknown>).donations_received),
    remaining: Number((data as Record<string, unknown>).remaining),
  };
}
