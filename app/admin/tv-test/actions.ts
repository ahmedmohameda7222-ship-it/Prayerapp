"use server";

import { requireAllowedAdminIdentity } from "@/lib/auth/admin-server";
import { beginAdminAudit, completeAdminAudit, adminActionError } from "@/lib/security/admin-audit";
import { parseTvTestRequest, TV_TEST_MAX_DURATION_MS, type TvTestCommand } from "@/lib/masjid-display/tv-test-control";
import { readTvTestCommand } from "@/lib/masjid-display/tv-test-server";
import { createServerClient } from "@/lib/supabase/server";

export type TvTestActionResult = {
  success: boolean;
  command?: TvTestCommand | null;
  error?: string;
};

export async function getTvTestStatusAction(token: string): Promise<TvTestActionResult> {
  try {
    await requireAllowedAdminIdentity(token);
    return { success: true, command: await readTvTestCommand() };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Unable to load TV Test status") };
  }
}

export async function startTvTestAction(token: string, input: unknown): Promise<TvTestActionResult> {
  let audit;
  try {
    audit = await beginAdminAudit(token, {
      action: "masjid_display.tv_test.start",
      entityType: "masjid_display_tv_test",
      entityId: "1",
    });
  } catch (error) {
    return { success: false, error: adminActionError(error, "TV Test audit unavailable") };
  }

  let result: TvTestActionResult;
  try {
    const request = parseTvTestRequest(input);
    const client = createServerClient();
    if (!client) throw new Error("Database unavailable");
    const started = new Date();
    const expires = new Date(started.getTime() + TV_TEST_MAX_DURATION_MS);
    const { error } = await client.from("masjid_display_tv_test").upsert({
      id: 1,
      scenario: request.scenario,
      prayer: request.prayer,
      started_at: started.toISOString(),
      expires_at: expires.toISOString(),
      updated_at: started.toISOString(),
    }, { onConflict: "id" });
    if (error) throw error;
    result = { success: true, command: { ...request, startedAt: started.toISOString(), expiresAt: expires.toISOString() } };
  } catch {
    result = { success: false, error: "Could not start TV Test" };
  }
  return completeAdminAudit(audit, result);
}

export async function stopTvTestAction(token: string): Promise<TvTestActionResult> {
  let audit;
  try {
    audit = await beginAdminAudit(token, {
      action: "masjid_display.tv_test.stop",
      entityType: "masjid_display_tv_test",
      entityId: "1",
    });
  } catch (error) {
    return { success: false, error: adminActionError(error, "TV Test audit unavailable") };
  }

  let result: TvTestActionResult;
  try {
    const client = createServerClient();
    if (!client) throw new Error("Database unavailable");
    const { error } = await client.from("masjid_display_tv_test").delete().eq("id", 1);
    if (error) throw error;
    result = { success: true, command: null };
  } catch {
    result = { success: false, error: "Could not stop TV Test" };
  }
  return completeAdminAudit(audit, result);
}
