"use server";

import { revalidatePath } from "next/cache";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";
import { invalidateFridayKhutbahCaches } from "@/lib/data/friday-khutbahs";
import { hasPublishableKhutbahContent, normalizeKhutbahForm, type FridayKhutbahForm } from "@/lib/friday-khutbah";
import { isFridayIso } from "@/lib/friday";
import { createServerClient } from "@/lib/supabase/server";
import type { FridayKhutbah } from "@/lib/types";
import { adminActionError, beginAdminAudit, finishAdminAudit } from "@/lib/security/admin-audit";
import { parseAdminDate, parseAdminText } from "@/lib/security/admin-input";

function optionalDbValue(value: string) { return value || null; }

function mapKhutbah(row: Record<string, unknown>): FridayKhutbah {
  const read = (key: string) => {
    const value = row[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  return {
    id: String(row.id), date: String(row.date), titleAr: read("title_ar"), contentAr: read("content_ar"),
    titleEn: read("title_en"), contentEn: read("content_en"), titleDe: read("title_de"), contentDe: read("content_de"),
    titleTr: read("title_tr"), contentTr: read("content_tr"), published: Boolean(row.published),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

async function validateFridayDate(client: NonNullable<ReturnType<typeof createServerClient>>, date: string) {
  if (!isFridayIso(date)) return false;
  const { data, error } = await client.from("prayer_times").select("date").eq("date", date).maybeSingle();
  return !error && Boolean(data);
}

function parseKhutbahForm(input: Partial<FridayKhutbahForm>): FridayKhutbahForm {
  const form = normalizeKhutbahForm(input);
  return {
    titleAr: parseAdminText(form.titleAr, { field: "titleAr", max: 300 }),
    contentAr: parseAdminText(form.contentAr, { field: "contentAr", max: 50_000 }),
    titleEn: parseAdminText(form.titleEn, { field: "titleEn", max: 300 }),
    contentEn: parseAdminText(form.contentEn, { field: "contentEn", max: 50_000 }),
    titleDe: parseAdminText(form.titleDe, { field: "titleDe", max: 300 }),
    contentDe: parseAdminText(form.contentDe, { field: "contentDe", max: 50_000 }),
    titleTr: parseAdminText(form.titleTr, { field: "titleTr", max: 300 }),
    contentTr: parseAdminText(form.contentTr, { field: "contentTr", max: 50_000 }),
  };
}

function revalidateKhutbahPaths(date: string) {
  invalidateFridayKhutbahCaches(); revalidatePath("/friday"); revalidatePath(`/friday/khutbah/${date}`); revalidatePath("/admin/jumuah"); revalidatePath("/");
}

export async function getFridayKhutbahAdminAction(token: string, date: string) {
  await requireAllowedAdmin(token);
  let safeDate: string; try { safeDate = parseAdminDate(date, "date"); } catch { return { success: false, error: "admin.errors.invalidInput" } as const; }
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" } as const;
  if (!(await validateFridayDate(client, safeDate))) return { success: false, error: "admin.errors.invalidInput" } as const;
  const { data, error } = await client.from("friday_khutbahs").select("*").eq("date", safeDate).maybeSingle();
  if (error) return { success: false, error: "admin.errors.loadFailed" } as const;
  return { success: true, khutbah: data ? mapKhutbah(data as Record<string, unknown>) : undefined } as const;
}

export async function saveFridayKhutbahAction(token: string, date: string, input: Partial<FridayKhutbahForm>, publish: boolean) {
  await requireAllowedAdmin(token);
  let safeDate: string; try { safeDate = parseAdminDate(date, "date"); } catch { return { success: false, error: "admin.errors.invalidInput" } as const; }
  let audit;
  try { audit = await beginAdminAudit(token, { action: "khutbah.save", entityType: "friday_khutbah", entityId: safeDate, metadata: { publish: Boolean(publish) } }); }
  catch (error) { return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") } as const; }
  const fail = async (error: string) => {
    try { await finishAdminAudit(audit, "failure", { error }); } catch { /* attempt record remains durable */ }
    return { success: false, error } as const;
  };

  const client = createServerClient();
  if (!client) return fail("admin.errors.supabaseNotConfigured");
  if (!(await validateFridayDate(client, safeDate))) return fail("admin.errors.invalidInput");
  let form: FridayKhutbahForm;
  try { form = parseKhutbahForm(input); } catch { return fail("admin.errors.invalidInput"); }
  if (publish && !hasPublishableKhutbahContent(form)) return fail("khutbahContentRequired");

  const db = {
    date: safeDate,
    title_ar: optionalDbValue(form.titleAr), content_ar: optionalDbValue(form.contentAr),
    title_en: optionalDbValue(form.titleEn), content_en: optionalDbValue(form.contentEn),
    title_de: optionalDbValue(form.titleDe), content_de: optionalDbValue(form.contentDe),
    title_tr: optionalDbValue(form.titleTr), content_tr: optionalDbValue(form.contentTr),
    published: Boolean(publish), updated_at: new Date().toISOString(),
  };
  const { data, error } = await client.from("friday_khutbahs").upsert(db as never, { onConflict: "date" }).select().single();
  if (error || !data) return fail("admin.errors.saveFailed");
  try { await finishAdminAudit(audit, "success"); } catch { return { success: false, error: "admin.errors.auditUnavailable" } as const; }
  revalidateKhutbahPaths(safeDate);
  return { success: true, khutbah: mapKhutbah(data as Record<string, unknown>) } as const;
}

export async function unpublishFridayKhutbahAction(token: string, date: string) {
  await requireAllowedAdmin(token);
  let safeDate: string; try { safeDate = parseAdminDate(date, "date"); } catch { return { success: false, error: "admin.errors.invalidInput" } as const; }
  let audit;
  try { audit = await beginAdminAudit(token, { action: "khutbah.unpublish", entityType: "friday_khutbah", entityId: safeDate }); }
  catch (error) { return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") } as const; }
  const fail = async (error: string) => {
    try { await finishAdminAudit(audit, "failure", { error }); } catch { /* attempt record remains durable */ }
    return { success: false, error } as const;
  };

  const client = createServerClient();
  if (!client) return fail("admin.errors.supabaseNotConfigured");
  if (!(await validateFridayDate(client, safeDate))) return fail("admin.errors.invalidInput");
  const { data, error } = await client.from("friday_khutbahs").update({ published: false, updated_at: new Date().toISOString() } as never).eq("date", safeDate).select().maybeSingle();
  if (error) return fail("admin.errors.saveFailed");
  try { await finishAdminAudit(audit, "success"); } catch { return { success: false, error: "admin.errors.auditUnavailable" } as const; }
  revalidateKhutbahPaths(safeDate);
  return { success: true, khutbah: data ? mapKhutbah(data as Record<string, unknown>) : undefined } as const;
}
