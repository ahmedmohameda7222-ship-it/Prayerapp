"use server";

import { revalidatePath } from "next/cache";
import { requireAllowedAdmin } from "@/lib/auth/admin-server";
import { invalidateFridayKhutbahCaches } from "@/lib/data/friday-khutbahs";
import { hasPublishableKhutbahContent, normalizeKhutbahForm, type FridayKhutbahForm } from "@/lib/friday-khutbah";
import { isFridayIso } from "@/lib/friday";
import { createServerClient } from "@/lib/supabase/server";
import type { FridayKhutbah } from "@/lib/types";

function optionalDbValue(value: string) {
  return value || null;
}

function mapKhutbah(row: Record<string, unknown>): FridayKhutbah {
  const read = (key: string) => {
    const value = row[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };

  return {
    id: String(row.id),
    date: String(row.date),
    titleAr: read("title_ar"),
    contentAr: read("content_ar"),
    titleEn: read("title_en"),
    contentEn: read("content_en"),
    titleDe: read("title_de"),
    contentDe: read("content_de"),
    titleTr: read("title_tr"),
    contentTr: read("content_tr"),
    published: Boolean(row.published),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function validateFridayDate(
  client: NonNullable<ReturnType<typeof createServerClient>>,
  date: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isFridayIso(date)) return false;
  const { data, error } = await client
    .from("prayer_times")
    .select("date")
    .eq("date", date)
    .maybeSingle();
  return !error && Boolean(data);
}

function revalidateKhutbahPaths(date: string) {
  invalidateFridayKhutbahCaches();
  revalidatePath("/friday");
  revalidatePath(`/friday/khutbah/${date}`);
  revalidatePath("/admin/jumuah");
  revalidatePath("/");
}

export async function getFridayKhutbahAdminAction(token: string, date: string) {
  await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" } as const;
  if (!(await validateFridayDate(client, date))) {
    return { success: false, error: "admin.errors.invalidInput" } as const;
  }

  const { data, error } = await client
    .from("friday_khutbahs")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (error) return { success: false, error: "admin.errors.loadFailed" } as const;
  return {
    success: true,
    khutbah: data ? mapKhutbah(data as Record<string, unknown>) : undefined,
  } as const;
}

export async function saveFridayKhutbahAction(
  token: string,
  date: string,
  input: Partial<FridayKhutbahForm>,
  publish: boolean,
) {
  await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" } as const;
  if (!(await validateFridayDate(client, date))) {
    return { success: false, error: "admin.errors.invalidInput" } as const;
  }

  const form = normalizeKhutbahForm(input);
  if (publish && !hasPublishableKhutbahContent(form)) {
    return { success: false, error: "khutbahContentRequired" } as const;
  }

  const db = {
    date,
    title_ar: optionalDbValue(form.titleAr),
    content_ar: optionalDbValue(form.contentAr),
    title_en: optionalDbValue(form.titleEn),
    content_en: optionalDbValue(form.contentEn),
    title_de: optionalDbValue(form.titleDe),
    content_de: optionalDbValue(form.contentDe),
    title_tr: optionalDbValue(form.titleTr),
    content_tr: optionalDbValue(form.contentTr),
    published: publish,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("friday_khutbahs")
    .upsert(db as never, { onConflict: "date" })
    .select()
    .single();

  if (error || !data) return { success: false, error: "admin.errors.saveFailed" } as const;

  revalidateKhutbahPaths(date);
  return { success: true, khutbah: mapKhutbah(data as Record<string, unknown>) } as const;
}

export async function unpublishFridayKhutbahAction(token: string, date: string) {
  await requireAllowedAdmin(token);
  const client = createServerClient();
  if (!client) return { success: false, error: "admin.errors.supabaseNotConfigured" } as const;
  if (!(await validateFridayDate(client, date))) {
    return { success: false, error: "admin.errors.invalidInput" } as const;
  }

  const { data, error } = await client
    .from("friday_khutbahs")
    .update({ published: false, updated_at: new Date().toISOString() } as never)
    .eq("date", date)
    .select()
    .maybeSingle();

  if (error) return { success: false, error: "admin.errors.saveFailed" } as const;

  revalidateKhutbahPaths(date);
  return {
    success: true,
    khutbah: data ? mapKhutbah(data as Record<string, unknown>) : undefined,
  } as const;
}
