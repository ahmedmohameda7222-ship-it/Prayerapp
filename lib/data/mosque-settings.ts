import type { MosqueSettings } from "../types";
import { createClient } from "../supabase/client";
import { persistentPublicCache, readPersistentPublicCache } from "./persistent-public-cache";

const fallback: MosqueSettings = {
  mosqueName: "Danube Mosque",
  address: "Amanstraße 21, 94469 Deggendorf",
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

function mapRow(row: Record<string, unknown>): MosqueSettings {
  return {
    mosqueName: String(row.mosque_name || ""),
    mosqueNameAr: row.mosque_name_ar ? String(row.mosque_name_ar) : undefined,
    mosqueNameEn: row.mosque_name_en ? String(row.mosque_name_en) : undefined,
    mosqueNameDe: row.mosque_name_de ? String(row.mosque_name_de) : undefined,
    mosqueNameTr: row.mosque_name_tr ? String(row.mosque_name_tr) : undefined,
    address: String(row.address || ""),
    phone: String(row.phone || ""),
    email: String(row.email || ""),
    googleMapsLink: String(row.google_maps_link || ""),
    whatsappLink: String(row.whatsapp_link || ""),
    telegramLink: String(row.telegram_link || ""),
    accountHolder: String(row.account_holder || ""),
    iban: String(row.iban || ""),
    bic: String(row.bic || ""),
    publicAppUrl: row.public_app_url ? String(row.public_app_url) : "",
  };
}

export async function getMosqueSettings(): Promise<MosqueSettings> {
  const client = createClient();
  if (!client) return fallback;
  const { data, error } = await client.from("mosque_settings").select("*").eq("id", "1").maybeSingle();
  if (error || !data) return readPersistentPublicCache("mosque_settings", fallback);
  const settings = mapRow(data as Record<string, unknown>);
  await persistentPublicCache("mosque_settings", settings);
  return settings;
}

export async function updateMosqueSettings(settings: MosqueSettings) {
  const client = createClient();
  if (!client) return fallback;
  const { error } = await client.from("mosque_settings").upsert({
    id: "1",
    mosque_name: settings.mosqueName,
    mosque_name_ar: settings.mosqueNameAr || null,
    mosque_name_en: settings.mosqueNameEn || null,
    mosque_name_de: settings.mosqueNameDe || null,
    mosque_name_tr: settings.mosqueNameTr || null,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    google_maps_link: settings.googleMapsLink,
    whatsapp_link: settings.whatsappLink,
    telegram_link: settings.telegramLink,
    account_holder: settings.accountHolder,
    iban: settings.iban,
    bic: settings.bic,
    public_app_url: settings.publicAppUrl || null,
  }, { onConflict: "id" });
  if (error) return fallback;
  return settings;
}
