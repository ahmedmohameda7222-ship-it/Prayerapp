"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { adminActionError, beginAdminAudit, finishAdminAudit } from "@/lib/security/admin-audit";
import { parseAdminEmail, parseAdminOptionalHttpsUrl, parseAdminText } from "@/lib/security/admin-input";

type ActionResult = { success: boolean; error?: string };

export async function updateMosqueSettingsAction(token: string, data: Record<string, string>): Promise<ActionResult> {
  let audit;
  try { audit = await beginAdminAudit(token, { action: "mosque_settings.update", entityType: "mosque_settings", entityId: "1" }); }
  catch (error) { return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") }; }
  const fail = async (error: string): Promise<ActionResult> => {
    try { await finishAdminAudit(audit, "failure", { error }); } catch { /* durable attempt remains */ }
    return { success: false, error };
  };

  let parsed;
  try {
    const iban = parseAdminText(data.iban ?? "", { field: "iban", max: 64 }).replace(/\s/g, "").toUpperCase();
    const bic = parseAdminText(data.bic ?? "", { field: "bic", max: 11 }).toUpperCase();
    if (iban && !/^[A-Z]{2}[0-9A-Z]{13,32}$/u.test(iban)) throw new Error("admin.errors.invalidInput");
    if (bic && !/^[A-Z0-9]{8}(?:[A-Z0-9]{3})?$/u.test(bic)) throw new Error("admin.errors.invalidInput");
    parsed = {
      mosqueNameAr: parseAdminText(data.mosqueNameAr, { field: "mosqueNameAr", max: 200, required: true }),
      mosqueNameEn: parseAdminText(data.mosqueNameEn ?? "", { field: "mosqueNameEn", max: 200 }),
      mosqueNameDe: parseAdminText(data.mosqueNameDe ?? "", { field: "mosqueNameDe", max: 200 }),
      mosqueNameTr: parseAdminText(data.mosqueNameTr ?? "", { field: "mosqueNameTr", max: 200 }),
      address: parseAdminText(data.address, { field: "address", max: 300, required: true }),
      phone: parseAdminText(data.phone ?? "", { field: "phone", max: 40 }),
      email: parseAdminEmail(data.email ?? "", "email") || "",
      googleMapsLink: parseAdminOptionalHttpsUrl(data.googleMapsLink, { field: "googleMapsLink", max: 500 }) || "",
      whatsappLink: parseAdminOptionalHttpsUrl(data.whatsappLink, { field: "whatsappLink", max: 500 }) || "",
      accountHolder: parseAdminText(data.accountHolder ?? "", { field: "accountHolder", max: 200 }),
      iban,
      bic,
    };
  } catch { return fail("admin.errors.invalidInput"); }

  const client = createServerClient();
  if (!client) return fail("admin.errors.supabaseNotConfigured");
  const db: Record<string, unknown> = {
    mosque_name: parsed.mosqueNameAr,
    mosque_name_ar: parsed.mosqueNameAr,
    mosque_name_en: parsed.mosqueNameEn || null,
    mosque_name_de: parsed.mosqueNameDe || null,
    mosque_name_tr: parsed.mosqueNameTr || null,
    address: parsed.address,
    phone: parsed.phone,
    email: parsed.email,
    google_maps_link: parsed.googleMapsLink,
    whatsapp_link: parsed.whatsappLink,
    telegram_link: "",
    account_holder: parsed.accountHolder,
    iban: parsed.iban,
    bic: parsed.bic,
  };
  const { error } = await client.from("mosque_settings").upsert({ id: "1", ...db }, { onConflict: "id" });
  if (error) return fail("admin.errors.saveFailed");
  try { await finishAdminAudit(audit, "success"); } catch { return { success: false, error: "admin.errors.auditUnavailable" }; }
  revalidatePath("/admin/settings"); revalidatePath("/mosque"); revalidatePath("/donations"); revalidatePath("/");
  return { success: true };
}
