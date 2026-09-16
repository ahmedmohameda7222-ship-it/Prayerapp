import { createClient } from "@/lib/supabase/client";
import type { MosqueSettings } from "@/lib/types";
import { localizedFieldsFromDb, localizedFieldsToDb, readDbString } from "./localized-db";
import { CACHE_TTL, getCached, invalidateCache } from "./cache";
import { saveToPersistentCache, loadFromPersistentCacheStale, clearPersistentCache } from "./persistent-public-cache";

const DEFAULT_MOSQUE_SETTINGS: MosqueSettings = {
  mosqueName: "",
  mosqueNameAr: "",
  mosqueNameEn: "",
  mosqueNameDe: "",
  mosqueNameTr: "",
  address: "",
  phone: "",
  email: "",
  googleMapsLink: "",
  whatsappLink: "",
  telegramLink: "",
  accountHolder: "",
  iban: "",
  bic: "",
  publicAppUrl: "",
};

export async function getMosqueSettings(): Promise<MosqueSettings> {
  const client = createClient();
  if (!client) return { ...DEFAULT_MOSQUE_SETTINGS };
  return getCached("mosque_settings", async () => {
    try {
      const { data, error } = await client.from("mosque_settings").select("*").single();
      if (error?.code === "PGRST116") return { ...DEFAULT_MOSQUE_SETTINGS };
      if (error || !data) throw new Error("Unable to load mosque settings");
      const record = data as Record<string, unknown>;
      const result = {
        mosqueName: readDbString(record, "mosque_name"),
        ...localizedFieldsFromDb(record, "mosqueName", "mosque_name"),
        address: String(record.address),
        phone: String(record.phone),
        email: String(record.email),
        googleMapsLink: String(record.google_maps_link),
        whatsappLink: String(record.whatsapp_link),
        telegramLink: String(record.telegram_link),
        accountHolder: String(record.account_holder),
        iban: String(record.iban),
        bic: String(record.bic),
        publicAppUrl: record.public_app_url ? String(record.public_app_url) : "",
      };
      saveToPersistentCache("mosque_settings", result, CACHE_TTL.mosqueSettings, 7 * 24 * 60 * 60 * 1000);
      return result;
    } catch (error) {
      const stale = loadFromPersistentCacheStale<MosqueSettings>("mosque_settings");
      if (stale) return stale;
      throw error;
    }
  }, CACHE_TTL.mosqueSettings);
}

export async function updateMosqueSettings(settings: Partial<MosqueSettings>): Promise<MosqueSettings> {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured");
  const db: Record<string, unknown> = {};
  Object.assign(db, localizedFieldsToDb(settings as Record<string, unknown>, "mosqueName", "mosque_name", { includeLegacy: true }));
  if (settings.mosqueName) db.mosque_name = settings.mosqueNameAr || settings.mosqueName;
  if (settings.address) db.address = settings.address;
  if (settings.phone) db.phone = settings.phone;
  if (settings.email) db.email = settings.email;
  if (settings.googleMapsLink) db.google_maps_link = settings.googleMapsLink;
  if (settings.whatsappLink) db.whatsapp_link = settings.whatsappLink;
  if (settings.telegramLink) db.telegram_link = settings.telegramLink;
  if (settings.accountHolder) db.account_holder = settings.accountHolder;
  if (settings.iban) db.iban = settings.iban;
  if (settings.bic) db.bic = settings.bic;
  if (settings.publicAppUrl !== undefined) db.public_app_url = settings.publicAppUrl || null;
  const { data, error } = await client.from("mosque_settings").upsert({ id: "1", ...db } as never, { onConflict: "id" }).select().single();
  if (error || !data) throw new Error("Unable to update mosque settings");
  invalidateCache("mosque_settings");
  clearPersistentCache("mosque_settings");
  return getMosqueSettings();
}
