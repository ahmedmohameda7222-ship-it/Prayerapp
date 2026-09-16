"use server";

import { revalidatePath } from "next/cache";
import { requireAllowedAdminIdentity } from "@/lib/auth/admin-server";
import { getMasjidDisplayTestState } from "@/lib/data/masjid-display-test-state";
import { getMosqueSettings } from "@/lib/data/mosque-settings";
import { buildTestFixture } from "@/lib/masjid-display/test-fixtures";
import { validatePublicAppUrl } from "@/lib/masjid-display/public-app-url";
import { createServerClient } from "@/lib/supabase/server";
import { MASJID_DISPLAY_TEST_SCENARIOS, type MasjidDisplayTestScenario, type MasjidDisplayTestState } from "@/lib/types";
import { adminActionError, beginAdminAudit, completeAdminAudit } from "@/lib/security/admin-audit";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

type ActionResult<T = undefined> = { success: boolean; data?: T; error?: string };

function isScenario(value: unknown): value is MasjidDisplayTestScenario {
  return typeof value === "string" && (MASJID_DISPLAY_TEST_SCENARIOS as readonly string[]).includes(value);
}

function revalidate() {
  revalidatePath("/admin/masjid-display-test");
  revalidatePath("/api/public/masjid-display-test-control");
}

export async function loadTestControlStateAction(token: string): Promise<ActionResult<MasjidDisplayTestState | null>> {
  try {
    await requireAllowedAdminIdentity(token);
    return { success: true, data: await getMasjidDisplayTestState() };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Unable to load Test Control") };
  }
}

export async function startTestScenario(token: string, scenario: unknown): Promise<ActionResult<MasjidDisplayTestState>> {
  let audit;
  try {
    audit = await beginAdminAudit(token, { action: "masjid_display.test.start", entityType: "masjid_display_test_state", entityId: "1" });
  } catch (error) {
    return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") };
  }

  let result: ActionResult<MasjidDisplayTestState>;
  try {
    if (!isScenario(scenario)) throw new Error("Unknown Test Control scenario");
    const mosque = await getMosqueSettings();
    const publicAppUrl = mosque.publicAppUrl.trim();
    if (!publicAppUrl) throw new Error("Prayerapp public URL is required before Test Mode can start");
    validatePublicAppUrl(publicAppUrl);

    const startedAt = new Date().toISOString();
    const expiresAt = new Date(new Date(startedAt).getTime() + FIFTEEN_MINUTES_MS).toISOString();
    const payload = buildTestFixture(scenario, startedAt);
    const client = createServerClient();
    const { data, error } = await client.from("masjid_display_test_state").upsert({
      id: "1",
      enabled: true,
      scenario,
      payload,
      started_at: startedAt,
      expires_at: expiresAt,
      updated_at: startedAt,
    }, { onConflict: "id" }).select("*").single();
    if (error || !data) throw new Error("Unable to start Test Mode");
    const state: MasjidDisplayTestState = {
      enabled: true,
      scenario,
      payload,
      startedAt,
      expiresAt,
      updatedAt: String(data.updated_at ?? startedAt),
    };
    revalidate();
    result = { success: true, data: state };
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : "Unable to start Test Mode" };
  }
  return completeAdminAudit(audit, result);
}

export async function extendTestScenario(token: string): Promise<ActionResult<MasjidDisplayTestState>> {
  let audit;
  try {
    audit = await beginAdminAudit(token, { action: "masjid_display.test.extend", entityType: "masjid_display_test_state", entityId: "1" });
  } catch (error) {
    return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") };
  }

  let result: ActionResult<MasjidDisplayTestState>;
  try {
    const current = await getMasjidDisplayTestState();
    if (!current?.enabled || !current.scenario || !current.payload || !current.startedAt || !current.expiresAt) {
      throw new Error("No active Test Mode scenario to extend");
    }
    const expiresAt = new Date(new Date(current.expiresAt).getTime() + FIFTEEN_MINUTES_MS).toISOString();
    const updatedAt = new Date().toISOString();
    const client = createServerClient();
    const { error } = await client.from("masjid_display_test_state").update({ expires_at: expiresAt, updated_at: updatedAt }).eq("id", "1");
    if (error) throw new Error("Unable to extend Test Mode");
    const state = { ...current, expiresAt, updatedAt };
    revalidate();
    result = { success: true, data: state };
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : "Unable to extend Test Mode" };
  }
  return completeAdminAudit(audit, result);
}

export async function stopTestScenario(token: string): Promise<ActionResult<MasjidDisplayTestState>> {
  let audit;
  try {
    audit = await beginAdminAudit(token, { action: "masjid_display.test.stop", entityType: "masjid_display_test_state", entityId: "1" });
  } catch (error) {
    return { success: false, error: adminActionError(error, "admin.errors.auditUnavailable") };
  }

  let result: ActionResult<MasjidDisplayTestState>;
  try {
    const updatedAt = new Date().toISOString();
    const client = createServerClient();
    const { error } = await client.from("masjid_display_test_state").upsert({
      id: "1",
      enabled: false,
      scenario: null,
      payload: null,
      started_at: null,
      expires_at: null,
      updated_at: updatedAt,
    }, { onConflict: "id" });
    if (error) throw new Error("Unable to stop Test Mode");
    const state: MasjidDisplayTestState = { enabled: false, scenario: null, payload: null, startedAt: null, expiresAt: null, updatedAt };
    revalidate();
    result = { success: true, data: state };
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : "Unable to stop Test Mode" };
  }
  return completeAdminAudit(audit, result);
}
