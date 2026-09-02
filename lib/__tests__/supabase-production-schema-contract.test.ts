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
    expect(ci).toContain("native delivery receipt privileges are not service-role-only");
  });
});
