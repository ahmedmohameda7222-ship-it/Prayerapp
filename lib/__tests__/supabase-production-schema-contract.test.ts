import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");

const reconciliationPath = "supabase/migrations/20260902170000_prelaunch_schema_reconciliation.sql";

describe("Production Supabase reconciliation contract", () => {
  it("keeps a read-only verifier for the native-delivery-v2 Production contract", () => {
    const verifier = source("scripts/security/verify-production-schema.sql");

    expect(verifier).toContain("RED: native_prayer_delivery_receipts is missing");
    expect(verifier).toContain("native_prayer_installations.receipt_v2 contract is missing or incompatible");
    expect(verifier).toContain("native_prayer_installations.account_generation contract is missing or incompatible");
    expect(verifier).toContain("native_prayer_delivery_receipts RLS is not enabled");
    expect(verifier).toContain("native_prayer_delivery_receipts is directly accessible to client roles");
    expect(verifier).toContain("service_role lacks required native_prayer_delivery_receipts privileges");
    expect(verifier).not.toMatch(/\b(?:alter|create|drop|delete|insert|update|truncate)\s+(?:table|into|from|public\.)/iu);
  });

  it("reproducibly verifies Friday V2 semantic equivalence", () => {
    const verifier = source("scripts/security/verify-production-schema.sql");

    expect(verifier).toContain("friday_khutbahs column contract is incomplete");
    expect(verifier).toContain("friday_khutbahs primary key is incompatible");
    expect(verifier).toContain("friday_khutbahs UNIQUE(date) is missing or incompatible");
    expect(verifier).toContain("friday_khutbahs Friday-date CHECK is missing or incompatible");
    expect(verifier).toContain("friday_khutbahs RLS is not enabled");
    expect(verifier).toContain("friday_khutbahs published-read policy is incompatible");
    expect(verifier).toContain("friday_khutbahs client grants are incompatible");
    expect(verifier).toContain("friday_khutbahs service_role grants are incompatible");
    expect(verifier).toContain("jumuah_times.khutbah_time must be nullable");
  });

  it("reproducibly verifies durable rate-limit semantic equivalence", () => {
    const verifier = source("scripts/security/verify-production-schema.sql");

    expect(verifier).toContain("security_rate_limits column contract is incomplete");
    expect(verifier).toContain("security_rate_limits primary key is incompatible");
    expect(verifier).toContain("security_rate_limits scope CHECK is missing or incompatible");
    expect(verifier).toContain("security_rate_limits identity_hash CHECK is missing or incompatible");
    expect(verifier).toContain("security_rate_limits request_count CHECK is missing or incompatible");
    expect(verifier).toContain("security_rate_limits_updated_at_idx is missing or incompatible");
    expect(verifier).toContain("security_rate_limits RLS is not enabled");
    expect(verifier).toContain("security_rate_limits must not expose direct application-role table access");
    expect(verifier).toContain("consume_security_rate_limit return contract is incompatible");
    expect(verifier).toContain("consume_security_rate_limit security-definer/search_path/owner contract is incompatible");
    expect(verifier).toContain("consume_security_rate_limit EXECUTE grants are incompatible");
    expect(verifier).toContain("consume_security_rate_limit implementation semantics are incompatible");
    expect(verifier).toContain("security-rate-limits-cleanup-hourly cron contract is incompatible");
  });

  it("reproducibly verifies atomic push-registration semantic equivalence", () => {
    const verifier = source("scripts/security/verify-production-schema.sql");

    expect(verifier).toContain("register_push_subscription return contract is incompatible");
    expect(verifier).toContain("register_push_subscription security-definer/search_path/owner contract is incompatible");
    expect(verifier).toContain("register_push_subscription EXECUTE grants are incompatible");
    expect(verifier).toContain("register_push_subscription implementation semantics are incompatible");
    expect(verifier).toContain("push-endpoint:");
    expect(verifier).toContain("push-user:");
    expect(verifier).toContain("ownership_mismatch");
    expect(verifier).toContain("account_limit_reached");
  });

  it("requires an idempotent, fail-closed reconciliation migration that preserves existing installation rows", () => {
    const migrationExists = existsSync(join(process.cwd(), reconciliationPath));
    expect(
      migrationExists,
      `${reconciliationPath} must exist before the reconciliation contract can become GREEN`,
    ).toBe(true);

    if (!migrationExists) return;
    const migration = source(reconciliationPath);

    expect(migration).toContain("add column if not exists receipt_v2 boolean not null default false");
    expect(migration).toContain("add column if not exists account_generation integer not null default 0");
    expect(migration).toContain("create table if not exists public.native_prayer_delivery_receipts");
    expect(migration).toContain("native_prayer_delivery_receipts_event_idx");
    expect(migration).toContain("native_prayer_delivery_receipts_expiry_idx");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on public.native_prayer_delivery_receipts from public, anon, authenticated");
    expect(migration).toContain("grant all on public.native_prayer_delivery_receipts to service_role");
    expect(migration).toContain("incompatible pre-existing receipt_v2 constraint");
    expect(migration).toContain("incompatible pre-existing account_generation constraint");
    expect(migration).toMatch(/raise exception/iu);
    expect(migration).not.toMatch(/delete\s+from\s+public\.native_prayer_installations/iu);
    expect(migration).not.toMatch(/truncate\s+(?:table\s+)?public\.native_prayer_installations/iu);
    expect(migration).not.toMatch(/update\s+public\.native_prayer_installations/iu);
  });

  it("requires clean-bootstrap CI to verify the reconciled receipt schema and privileges", () => {
    const ci = source(".github/workflows/ci.yml");

    expect(ci).toContain("native_prayer_delivery_receipts missing after clean migration reset");
    expect(ci).toContain("native_prayer_installations.receipt_v2 contract missing after clean migration reset");
    expect(ci).toContain("native_prayer_installations.account_generation contract missing after clean migration reset");
    expect(ci).toContain("native_prayer_installations.account_generation CHECK missing after clean migration reset");
    expect(ci).toContain("native delivery receipt primary key missing after clean migration reset");
    expect(ci).toContain("native delivery receipt installation FK missing after clean migration reset");
    expect(ci).toContain("native delivery receipt user FK missing after clean migration reset");
    expect(ci).toContain("native delivery receipt CHECK contract missing after clean migration reset");
    expect(ci).toContain("native delivery receipt indexes missing after clean migration reset");
    expect(ci).toContain("native delivery receipt RLS missing after clean migration reset");
    expect(ci).toContain("native delivery receipt privileges are not service-role-only");
  });

  it("requires permanent local idempotence, preservation, fail-closed, and verifier execution evidence", () => {
    const ci = source(".github/workflows/ci.yml");

    expect(ci).toContain("Verify reconciliation idempotence and data preservation");
    expect(ci).toContain("synthetic native installation row was not preserved");
    expect(ci).toContain("Verify reconciliation rejects incompatible partial schemas");
    expect(ci).toContain("incompatible receipt_v2 constraint was not rejected");
    expect(ci).toContain("incompatible account_generation constraint was not rejected");
    expect(ci).toContain("verify-production-schema.sql");
  });
});
