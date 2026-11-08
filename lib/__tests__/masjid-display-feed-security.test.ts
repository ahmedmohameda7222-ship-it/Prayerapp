import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FIXTURE_PATH = "lib/masjid-display/__fixtures__/feed-v1.json";
const ROUTE_PATH = "app/api/public/masjid-display/route.ts";
const BUILDER_PATH = "lib/masjid-display/build-feed.ts";

describe("Masjid Display Feed public security boundary", () => {
  it("contains no private, account, calculation, or legacy absolute-Iqama fields", () => {
    const json = readFileSync(FIXTURE_PATH, "utf8");
    const forbidden = [
      "admin_users",
      "audit_logs",
      "service_role",
      "supabaseKey",
      "latitude",
      "longitude",
      "fajrAngle",
      "ishaAngle",
      "calculationRevision",
      "appliedCalculationRevision",
      "fajr_" + "iqama",
      "dhuhr_" + "iqama",
      "asr_" + "iqama",
      "maghrib_" + "iqama",
      "isha_" + "iqama",
      "fajr" + "Iqama",
    ];

    for (const field of forbidden) expect(json).not.toContain(field);
  });

  it("exports a GET-only route and no public mutation handlers", () => {
    const source = readFileSync(ROUTE_PATH, "utf8");
    expect(source).toMatch(/export async function GET\(/);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(source).not.toMatch(new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`));
      expect(source).not.toMatch(new RegExp(`export\\s+const\\s+${method}\\b`));
    }
  });

  it("keeps the feed projection isolated from prayer generation and raw Supabase access", () => {
    const builder = readFileSync(BUILDER_PATH, "utf8");
    const route = readFileSync(ROUTE_PATH, "utf8");
    expect(builder).not.toContain("prayer-engine/generate");
    expect(builder).not.toContain("prayer-engine/calculate");
    expect(route).not.toContain("createServiceRoleClient");
    expect(route).not.toContain("createClient(");
    expect(route).not.toContain("supabase.from(");
  });

  it("does not log raw feed-build error objects or messages", () => {
    const source = readFileSync(ROUTE_PATH, "utf8");
    expect(source).not.toContain('console.error("Masjid Display feed build failed", error)');
    expect(source).toContain("errorType");
  });
});


describe("Masjid Display Plan 5 attacker-perspective boundary", () => {
  it("does not expose the retired public TV Test Control endpoint", () => {
    expect(existsSync("app/api/public/masjid-display-test-control/route.ts")).toBe(false);
    expect(existsSync("app/admin/masjid-display-test/page.tsx")).toBe(false);
  });

  it("keeps the public Feed horizon and production source/output bounds explicit", () => {
    const builder = readFileSync(BUILDER_PATH, "utf8");
    const boundsMigration = readFileSync(
      "supabase/migrations/20260919023000_masjid_display_feed_bounds.sql",
      "utf8",
    );
    expect(builder).toContain("const startDate = addDaysIso(today, -1)");
    expect(builder).toContain("const endDate = addDaysIso(today, 35)");
    expect(builder).toContain("MAX_MASJID_DISPLAY_FEED_BYTES");
    expect(boundsMigration).toContain("limit 65");
    expect(boundsMigration).toContain("limit 129");
    expect(boundsMigration).toContain("pg_column_size");
    expect(boundsMigration).toMatch(/raise exception/i);
    expect(boundsMigration).not.toMatch(/pg_column_size\([^\n]+\)\s*<=/i);

    // Public RPC parameters must not permit arbitrarily broad source scans.
    expect(boundsMigration).toContain("p_end_date - p_start_date > 36");
    expect(boundsMigration).toContain("p_horizon_end > p_now + interval '37 days'");

    // Size checks must operate only on the bounded max+1 set, never on every
    // matching source row before LIMIT is applied.
    expect(boundsMigration).not.toMatch(
      /if exists \([\s\S]*?pg_column_size\(to_jsonb\(/i,
    );
    expect((boundsMigration.match(/with bounded as \(/gi) ?? []).length).toBe(4);
    expect((boundsMigration.match(/max\(pg_column_size\(row_json\)\)/gi) ?? []).length).toBe(4);
  });

  it("does not expose secret-bearing keys or internal error details in public payloads", () => {
    const fixture = readFileSync(FIXTURE_PATH, "utf8");
    const route = readFileSync(ROUTE_PATH, "utf8");
    for (const marker of [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SECRET_KEY",
      "SERVICE_ROLE_KEY",
      "admin_users",
      "audit_logs",
      "password",
      "access_token",
      "refresh_token",
    ]) {
      expect(fixture).not.toContain(marker);
    }
    expect(route).toContain('{ error: "masjid_display_feed_unavailable" }');
    expect(route).not.toMatch(/stack|sql|postgres|supabase.*error/i);
  });
});
