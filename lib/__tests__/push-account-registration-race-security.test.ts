import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const migrationPath = "supabase/migrations/20260901223000_atomic_push_account_registration.sql";

describe("push account registration race hardening", () => {
  it("serializes the account cap check and registration inside a service-role-only database RPC", () => {
    const route = source("app/api/push/subscriptions/route.ts");
    const migrationExists = existsSync(join(process.cwd(), migrationPath));
    const migration = migrationExists ? source(migrationPath) : "";

    expect(migrationExists).toBe(true);
    expect(route).toContain('"register_push_subscription"');
    expect(route).not.toContain('count: "exact"');

    expect(migration).toContain("create or replace function public.register_push_subscription");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = pg_catalog, public");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("'push-user:'");
    expect(migration).toContain("select count(*)");
    expect(migration).toContain("insert into public.push_subscriptions");
    expect(migration).toContain("revoke all on function public.register_push_subscription");
    expect(migration).toContain("grant execute on function public.register_push_subscription");

    const accountLock = migration.indexOf("'push-user:'");
    const count = migration.indexOf("select count(*)");
    const write = migration.indexOf("insert into public.push_subscriptions");
    expect(accountLock).toBeGreaterThan(-1);
    expect(count).toBeGreaterThan(accountLock);
    expect(write).toBeGreaterThan(count);
  });
});
