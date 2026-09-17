import { createClient } from "@/lib/supabase/client";
import type { DonationSettings, DonationCampaign, Donation, DonationReport } from "@/lib/types";
import { localizedFieldsFromDb, localizedFieldsToDb, readDbString } from "./localized-db";
import { CACHE_TTL, getCached, invalidateCache, invalidateCachePrefix } from "./cache";
import { saveToPersistentCache, loadFromPersistentCacheStale, clearPersistentCache, clearPersistentCachePrefix } from "./persistent-public-cache";

export type DisplayDonationCampaignSource = DonationCampaign & { sourceUpdatedAt: string };

const DEFAULT_SETTINGS: DonationSettings = {
  accountHolder: "",
  iban: "",
  bic: "",
  paypalLink: "",
  defaultPurpose: "",
  defaultPurposeAr: "",
  defaultPurposeEn: "",
  defaultPurposeDe: "",
  defaultPurposeTr: "",
};

export function invalidateDonationCampaignCaches() {
  invalidateCachePrefix("donation_campaigns");
  clearPersistentCachePrefix("donation_campaigns");
}

function emptyDonationReport(): DonationReport {
  return {
    month: new Date().toISOString().slice(0, 7),
    monthlyNeed: 0,
    donationsReceived: 0,
    remaining: 0,
  };
}

export async function getDonationSettings(): Promise<DonationSettings> {
  const client = createClient();
  if (!client) return { ...DEFAULT_SETTINGS };
  return getCached("donation_settings", async () => {
    try {
      const { data, error } = await client.from("donation_settings").select("*").single();
      const record = data as Record<string, unknown> | null;
      if (error?.code === "PGRST116") return { ...DEFAULT_SETTINGS };
      if (error || !record) throw new Error("Unable to load donation settings");
      const result = {
        accountHolder: String(record.account_holder),
        iban: String(record.iban),
        bic: String(record.bic),
        paypalLink: record.paypal_link ? String(record.paypal_link) : undefined,
        defaultPurpose: readDbString(record, "default_purpose"),
        ...localizedFieldsFromDb(record, "defaultPurpose", "default_purpose"),
      };
      saveToPersistentCache("donation_settings", result, CACHE_TTL.donationSettings, 3 * 24 * 60 * 60 * 1000);
      return result;
    } catch (error) {
      const stale = loadFromPersistentPublicCacheStale<DonationSettings>("donation_settings");
      if (stale) return stale;
      throw error;
    }
  }, CACHE_TTL.donationSettings);
}

function loadFromPersistentPublicCacheStale<T>(key: string): T | null {
  return loadFromPersistentCacheStale<T>(key);
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
  if (settings.defaultPurpose) db.default_purpose = settings.defaultPurposeAr || settings.defaultPurpose;
  const { data, error } = await client.from("donation_settings").upsert({ id: "1", ...db } as never, { onConflict: "id" }).select().single();
  if (error || !data) throw new Error("Unable to update donation settings");
  invalidateCache("donation_settings");
  clearPersistentCache("donation_settings");
  return getDonationSettings();
}

function mapCampaignRecord(record: Record<string, unknown>): DonationCampaign {
  return {
    id: String(record.id),
    title: readDbString(record, "title"),
    description: readDbString(record, "description"),
    targetAmount: Number(record.target_amount),
    collectedAmount: Number(record.collected_amount),
    startDate: String(record.start_date),
    endDate: record.end_date ? String(record.end_date) : undefined,
    donationUrl: record.donation_url ? String(record.donation_url) : undefined,
    isActive: Boolean(record.is_active),
    isFeatured: Boolean(record.is_featured),
    ...localizedFieldsFromDb(record, "title", "title"),
    ...localizedFieldsFromDb(record, "description", "description"),
  };
}

export async function getDonationCampaignsForDisplayWindow(startDate: string, endDate: string): Promise<DisplayDonationCampaignSource[]> {
  const client = createClient();
  if (!client) return [];

  const { data, error } = await client.rpc("get_masjid_display_campaigns_window", {
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error || !Array.isArray(data)) throw new Error("Unable to load donation campaigns");

  return (data as Record<string, unknown>[]).map((row) => ({
    ...mapCampaignRecord(row),
    sourceUpdatedAt: String(row.updated_at),
  }));
}

export async function getDonationCampaigns(includeInactive = false): Promise<DonationCampaign[]> {
  const client = createClient();
  if (!client) return [];
  if (includeInactive) {
    const query = client
      .from("donation_campaigns")
      .select("*")
      .order("end_date", { ascending: true, nullsFirst: false });
    const { data, error } = await query;
    if (error || !data) throw new Error("Unable to load donation campaigns");
    return data.map((row: unknown) => mapCampaignRecord(row as Record<string, unknown>));
  }
  const key = `donation_campaigns_public`;
  return getCached(key, async () => {
    try {
      const query = client
        .from("donation_campaigns")
        .select("*")
        .order("end_date", { ascending: true, nullsFirst: false })
        .eq("is_active", true);
      const { data, error } = await query;
      if (error || !data) throw new Error("Unable to load donation campaigns");
      const result = data.map((row: unknown) => mapCampaignRecord(row as Record<string, unknown>));
      saveToPersistentCache(key, result, CACHE_TTL.donationCampaigns, 3 * 24 * 60 * 60 * 1000);
      return result;
    } catch (error) {
      const stale = loadFromPersistentCacheStale<DonationCampaign[]>(key);
      if (stale) return stale;
      throw error;
    }
  }, CACHE_TTL.donationCampaigns);
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
    end_date: item.endDate ?? null,
    donation_url: item.donationUrl ?? null,
    is_active: item.isActive,
    is_featured: item.isFeatured,
  };
  const { data, error } = await client.from("donation_campaigns").insert(db as never).select().single();
  if (error || !data) throw new Error("Failed to create campaign");
  invalidateDonationCampaignCaches();
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
  if (item.endDate !== undefined) db.end_date = item.endDate || null;
  if (item.donationUrl !== undefined) db.donation_url = item.donationUrl || null;
  if (item.isActive !== undefined) db.is_active = item.isActive;
  if (item.isFeatured !== undefined) db.is_featured = item.isFeatured;
  const { data, error } = await client.from("donation_campaigns").update(db as never).eq("id", id).select().single();
  if (error || !data) throw new Error("Failed to update campaign");
  invalidateDonationCampaignCaches();
  return { ...item, id: String((data as Record<string, unknown>).id) } as DonationCampaign;
}

export async function deleteDonationCampaign(id: string): Promise<void> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const { error } = await client.from("donation_campaigns").delete().eq("id", id);
  if (error) throw new Error("Failed to delete campaign");
  invalidateDonationCampaignCaches();
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
  if (!client) return emptyDonationReport();
  return getCached("donation_report", async () => {
    try {
      const { data, error } = await client.from("donation_reports").select("*").order("month", { ascending: false }).limit(1).single();
      if (error?.code === "PGRST116") return emptyDonationReport();
      if (error || !data) throw new Error("Unable to load donation report");
      const result = {
        month: String((data as Record<string, unknown>).month),
        monthlyNeed: Number((data as Record<string, unknown>).monthly_need),
        donationsReceived: Number((data as Record<string, unknown>).donations_received),
        remaining: Number((data as Record<string, unknown>).remaining),
      };
      saveToPersistentCache("donation_report", result, CACHE_TTL.donationReport, 3 * 24 * 60 * 60 * 1000);
      return result;
    } catch (error) {
      const stale = loadFromPersistentCacheStale<DonationReport>("donation_report");
      if (stale) return stale;
      throw error;
    }
  }, CACHE_TTL.donationReport);
}
