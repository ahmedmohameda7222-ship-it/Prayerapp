import { createClient } from "@/lib/supabase/client";
import {
  donationSettings as mockDonationSettings,
  donationCampaigns as mockDonationCampaigns,
  donations as mockDonations,
  receiptRequests as mockReceiptRequests,
  donationReport as mockDonationReport,
} from "@/lib/mock-data";
import type { DonationSettings, DonationCampaign, Donation, DonationReceiptRequest, DonationReport } from "@/lib/types";

export async function getDonationSettings(): Promise<DonationSettings> {
  const client = createClient();
  if (!client) return mockDonationSettings;
  const { data, error } = await client.from("donation_settings").select("*").single();
  if (error || !data) return mockDonationSettings;
  return {
    accountHolder: String(data.account_holder),
    iban: String(data.iban),
    bic: String(data.bic),
    paypalLink: data.paypal_link ? String(data.paypal_link) : undefined,
    defaultPurpose: String(data.default_purpose),
    receiptNote: String(data.receipt_note),
  };
}

export async function updateDonationSettings(settings: Partial<DonationSettings>): Promise<DonationSettings> {
  const client = createClient();
  if (!client) return { ...mockDonationSettings, ...settings } as DonationSettings;
  const db: Record<string, unknown> = {};
  if (settings.accountHolder) db.account_holder = settings.accountHolder;
  if (settings.iban) db.iban = settings.iban;
  if (settings.bic) db.bic = settings.bic;
  if (settings.paypalLink !== undefined) db.paypal_link = settings.paypalLink;
  if (settings.defaultPurpose) db.default_purpose = settings.defaultPurpose;
  if (settings.receiptNote) db.receipt_note = settings.receiptNote;
  const { data, error } = await client.from("donation_settings").update(db).eq("id", "1").select().single();
  if (error || !data) return { ...mockDonationSettings, ...settings } as DonationSettings;
  return getDonationSettings();
}

export async function getDonationCampaigns(): Promise<DonationCampaign[]> {
  const client = createClient();
  if (!client) return mockDonationCampaigns;
  const { data, error } = await client
    .from("donation_campaigns")
    .select("*")
    .eq("is_active", true)
    .order("end_date", { ascending: true });
  if (error || !data) return mockDonationCampaigns;
  return data.map((row: unknown) => ({
    id: String((row as Record<string, unknown>).id),
    title: String((row as Record<string, unknown>).title),
    description: String((row as Record<string, unknown>).description),
    targetAmount: Number((row as Record<string, unknown>).target_amount),
    collectedAmount: Number((row as Record<string, unknown>).collected_amount),
    startDate: String((row as Record<string, unknown>).start_date),
    endDate: String((row as Record<string, unknown>).end_date),
    isActive: Boolean((row as Record<string, unknown>).is_active),
    isFeatured: Boolean((row as Record<string, unknown>).is_featured),
  }));
}

export async function createDonationCampaign(item: Omit<DonationCampaign, "id">): Promise<DonationCampaign> {
  const client = createClient();
  if (!client) return { ...item, id: `mock-${Date.now()}` } as DonationCampaign;
  const db = {
    title: item.title,
    description: item.description,
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
  if (!client) {
    const existing = mockDonationCampaigns.find((c) => c.id === id);
    if (!existing) throw new Error("Not found");
    return { ...existing, ...item } as DonationCampaign;
  }
  const db: Record<string, unknown> = {};
  if (item.title) db.title = item.title;
  if (item.description) db.description = item.description;
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
  if (!client) return;
  const { error } = await client.from("donation_campaigns").delete().eq("id", id);
  if (error) throw new Error("Failed to delete campaign");
}

export async function getDonations(): Promise<Donation[]> {
  const client = createClient();
  if (!client) return mockDonations;
  const { data, error } = await client.from("donations").select("*").order("received_at", { ascending: false });
  if (error || !data) return mockDonations;
  return data.map((row: unknown) => ({
    id: String((row as Record<string, unknown>).id),
    amount: Number((row as Record<string, unknown>).amount),
    purpose: String((row as Record<string, unknown>).purpose),
    donorName: (row as Record<string, unknown>).donor_name ? String((row as Record<string, unknown>).donor_name) : undefined,
    receivedAt: String((row as Record<string, unknown>).received_at),
    method: String((row as Record<string, unknown>).method) as Donation["method"],
  }));
}

export async function getDonationReceiptRequests(): Promise<DonationReceiptRequest[]> {
  const client = createClient();
  if (!client) return mockReceiptRequests;
  const { data, error } = await client.from("donation_receipt_requests").select("*").order("created_at", { ascending: false });
  if (error || !data) return mockReceiptRequests;
  return data.map((row: unknown) => ({
    id: String((row as Record<string, unknown>).id),
    donorName: String((row as Record<string, unknown>).donor_name),
    amount: Number((row as Record<string, unknown>).amount),
    email: String((row as Record<string, unknown>).email),
    status: String((row as Record<string, unknown>).status) as DonationReceiptRequest["status"],
    createdAt: String((row as Record<string, unknown>).created_at),
  }));
}

export async function getDonationReport(): Promise<DonationReport> {
  const client = createClient();
  if (!client) return mockDonationReport;
  const { data, error } = await client.from("donation_reports").select("*").order("month", { ascending: false }).limit(1).single();
  if (error || !data) return mockDonationReport;
  return {
    month: String((data as Record<string, unknown>).month),
    monthlyNeed: Number((data as Record<string, unknown>).monthly_need),
    donationsReceived: Number((data as Record<string, unknown>).donations_received),
    remaining: Number((data as Record<string, unknown>).remaining),
  };
}
