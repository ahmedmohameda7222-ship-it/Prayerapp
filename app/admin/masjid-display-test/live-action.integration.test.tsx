import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { startTestScenario, stopTestScenario } from "./actions";

const action = process.env.PLAN4_ADMIN_ACTION;
const integrationDescribe = action ? describe : describe.skip;
const ADMIN_EMAIL = "integration-admin@example.invalid";
const ADMIN_PASSWORD = "Plan4-integration-Only-2026!";

async function adminToken() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !publicKey || !secretKey) {
    throw new Error("Local Supabase integration environment is incomplete");
  }

  process.env.ADMIN_EMAILS = ADMIN_EMAIL;

  const service = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const created = await service.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (created.error && created.error.status !== 422) {
    throw created.error;
  }

  const browser = createClient(url, publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const signedIn = await browser.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (signedIn.error || !signedIn.data.session?.access_token) {
    throw signedIn.error ?? new Error("Admin integration sign-in returned no access token");
  }

  return signedIn.data.session.access_token;
}

integrationDescribe("live Masjid Display Admin Test Mode action", () => {
  it("executes the requested authenticated Admin mutation", async () => {
    const token = await adminToken();

    if (action === "start") {
      const result = await startTestScenario(token, "prayer_approaching");
      expect(result).toMatchObject({
        success: true,
        data: {
          enabled: true,
          scenario: "prayer_approaching",
        },
      });
      expect(result.data?.payload).toMatchObject({
        scenario: "prayer_approaching",
        prayer: "isha",
      });
      return;
    }

    if (action === "stop") {
      const result = await stopTestScenario(token);
      expect(result).toMatchObject({
        success: true,
        data: {
          enabled: false,
          scenario: null,
          payload: null,
        },
      });
      return;
    }

    throw new Error(`Unsupported PLAN4_ADMIN_ACTION: ${String(action)}`);
  });
});
