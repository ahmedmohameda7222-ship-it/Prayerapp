import { createClient } from "@/lib/supabase/client";
import { mosqueSettings as mockMosqueSettings } from "@/lib/mock-data";
import type { MosqueSettings } from "@/lib/types";

export async function getMosqueSettings(): Promise<MosqueSettings> {
  const client = createClient();
  if (!client) return mockMosqueSettings;
  const { data, error } = await client.from("mosque_settings").select("*").single();
  if (error || !data) return mockMosqueSettings;
  return {
    mosqueName: String((data as Record<string, unknown>).mosque_name),
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
}

export async function updateMosqueSettings(settings: Partial<MosqueSettings>): Promise<MosqueSettings> {
  const client = createClient();
  if (!client) return { ...mockMosqueSettings, ...settings } as MosqueSettings;
  const db: Record<string, unknown> = {};
  if (settings.mosqueName) db.mosque_name = settings.mosqueName;
  if (settings.address) db.address = settings.address;
  if (settings.phone) db.phone = settings.phone;
  if (settings.email) db.email = settings.email;
  if (settings.googleMapsLink) db.google_maps_link = settings.googleMapsLink;
  if (settings.whatsappLink) db.whatsapp_link = settings.whatsappLink;
  if (settings.telegramLink) db.telegram_link = settings.telegramLink;
  if (settings.accountHolder) db.account_holder = settings.accountHolder;
  if (settings.iban) db.iban = settings.iban;
  if (settings.bic) db.bic = settings.bic;
  const { data, error } = await client.from("mosque_settings").update(db).eq("id", "1").select().single();
  if (error || !data) return { ...mockMosqueSettings, ...settings } as MosqueSettings;
  return getMosqueSettings();
}
