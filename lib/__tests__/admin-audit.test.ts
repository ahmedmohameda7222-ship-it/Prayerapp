import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeAdminAuditMetadata } from "@/lib/security/admin-audit-core";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");

const ADMIN_ACTION_FILES = [
  "app/admin/announcements/actions.ts",
  "app/admin/donations/actions.ts",
  "app/admin/events/actions.ts",
  "app/admin/jumuah/actions.ts",
  "app/admin/jumuah/khutbah-actions.ts",
  "app/admin/prayer-times/actions.ts",
  "app/admin/ramadan/actions.ts",
  "app/admin/settings/actions.ts",
] as const;

describe("durable admin audit security contract", () => {
  it("drops secret-like metadata and enforces a bounded JSON payload", () => {
    const metadata = sanitizeAdminAuditMetadata({
      locale: "de",
      changedFields: ["title", "published"],
      authorization: "Bearer should-never-persist",
      password: "do-not-store",
      serviceRoleKey: "do-not-store",
      nativeCredential: "do-not-store",
      nested: {
        cookie: "do-not-store",
        safe: "x".repeat(8_000),
      },
    });
    const serialized = JSON.stringify(metadata);

    expect(serialized).not.toContain("Bearer should-never-persist");
    expect(serialized).not.toContain("do-not-store");
    expect(serialized).not.toMatch(/authorization|password|service.?role|credential|cookie/iu);
    expect(Buffer.byteLength(serialized, "utf8")).toBeLessThanOrEqual(4_096);
    expect(metadata).toMatchObject({ locale: "de" });
  });

  it("requires every privileged mutation family to use the durable truthful audit helper", () => {
    for (const path of ADMIN_ACTION_FILES) {
      const file = source(path);
      expect(file, `${path} must use the durable admin audit helper`).toContain("@/lib/security/admin-audit");
      expect(file, `${path} must begin a durable audit attempt before mutation`).toContain("beginAdminAudit");
      expect(file, `${path} must preserve committed mutation semantics when terminal audit completion fails`).toContain("completeAdminAudit");
      expect(file, `${path} must not implement bespoke terminal audit completion`).not.toContain("finishAdminAudit");
    }
  });

  it("requires an append-only service-role RPC and no direct application-role writes", () => {
    const migrations = source("supabase/migrations/20260902223939_admin_audit_hardening.sql");

    expect(migrations).toContain("append_admin_audit_event");
    expect(migrations).toContain("security definer");
    expect(migrations).toContain("set search_path = pg_catalog, public");
    expect(migrations).toContain("revoke all on public.audit_logs from public, anon, authenticated, service_role");
    expect(migrations).toContain("grant select on public.audit_logs to service_role");
    expect(migrations).toContain("revoke all on function public.append_admin_audit_event");
    expect(migrations).toContain("grant execute on function public.append_admin_audit_event");
    expect(migrations).toContain("metadata_too_large");
    expect(migrations).not.toMatch(/grant\s+(?:insert|update|delete|truncate).*audit_logs.*service_role/iu);
  });

  it("requires permanent Production verification and local migration exercises", () => {
    const verifier = source("scripts/security/verify-production-schema.sql");
    const ci = source(".github/workflows/ci.yml");

    for (const marker of [
      "v_audit_rel",
      "public.append_admin_audit_event(uuid,text,text,text,text,text,jsonb,text)",
      "audit_logs column contract is incomplete",
      "audit_logs CHECK contract is incompatible",
      "audit_logs RLS is not enabled",
      "audit_logs privilege contract is incompatible",
      "append_admin_audit_event security-definer/search_path/owner contract is incompatible",
      "append_admin_audit_event EXECUTE grants are incompatible",
    ]) {
      expect(verifier, `Production verifier missing admin-audit marker: ${marker}`).toContain(marker);
    }

    for (const marker of [
      "Verify admin audit idempotence and data preservation",
      "Verify admin audit rejects non-empty legacy state",
      "synthetic admin audit row was not preserved",
      "cannot add actor_user_id to non-empty audit_logs without truthful historical actor evidence",
    ]) {
      expect(ci, `CI missing admin-audit migration exercise: ${marker}`).toContain(marker);
    }
  });
});
