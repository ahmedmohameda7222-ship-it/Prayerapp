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
};

export async function getMosqueSettings(): Promise<MosqueSettings> {
  const client = createClient();
  if (!client) return { ...DEFAULT_MOSQUE_SETTINGS };
  return getCached("mosque_settings", async () => {
    try {
      const { data, error } = await client.from("mosque_settings").select("*").single();
      if (error?.code === "PGRST116") return { ...DEFAULT_MOSQUE_SETTINGS };
      if (error || !data) throw new Error("Unable to load mosque settings");
      const result = {
        mosqueName: readDbString(data as Record<string, unknown>, "mosque_name"),
        ...localizedFieldsFromDb(data as Record<string, unknown>, "mosqueName", "mosque_name"),
        address: String((data as Record<string, unknown>).address),
        phone: String((data as Record<string, unknown>).phone),
        email: String((data as Record<string, unknown>).email),
        googleMapsLink: String((data as Record<string, unknown>).google_maps_link),
        whatsappLink: String((data as Record<string, unknown>).whatsapp_link),
        telegramLink: String((data as Record<string, unknown>).telegram_link),
        accountHolder: String((data as Record<string, unknown>).account_holder),
        iban: String((data as Record<string, unknown>).iban),
        bic: String((data as Record<string, unknown>).bic),
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
  const { data, error } = await client.from("mosque_settings").upsert({ id: "1", ...db } as never, { onConflict: "id" }).select().single();
  if (error || !data) throw new Error("Unable to update mosque settings");
  invalidateCache("mosque_settings");
  clearPersistentCache("mosque_settings");
  return getMosqueSettings();
}
