import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("durable abuse-control security contract", () => {
  it("uses one service-role-only Supabase rate-limit primitive", () => {
    const migrations = readdirSync(join(root, "supabase/migrations"));
    const migrationName = migrations.find((name) => name.includes("security_rate_limits"));

    expect(migrationName).toBeDefined();
    const migration = read(`supabase/migrations/${migrationName}`);
    expect(migration).toContain("security_rate_limits");
    expect(migration).toContain("enable row level security");
    expect(migration).toMatch(/revoke all[\s\S]*from public, anon, authenticated/i);
    expect(migration).toMatch(/security definer/i);
    expect(migration).toMatch(/set search_path\s*=\s*public,\s*pg_temp/i);
    expect(migration).toMatch(/grant execute[\s\S]*to service_role/i);
    expect(migration).not.toMatch(/grant execute[\s\S]*to (?:anon|authenticated)/i);
  });

  it("hashes abuse identities before persistence and trusts Vercel's canonical client IP header", () => {
    const helperPath = "lib/security/rate-limit.ts";
    expect(existsSync(join(root, helperPath))).toBe(true);
    const helper = read(helperPath);

    expect(helper).toContain('createHash("sha256")');
    expect(helper).toContain('request.headers.get("x-forwarded-for")');
    expect(helper).toContain("consume_security_rate_limit");
    expect(helper).not.toContain('request.headers.get("x-rate-limit-key")');
  });

  it("removes process-local Maps and enforces durable quotas on every abuse-sensitive proxy", () => {
    const targets = [
      ["app/api/geocode/route.ts", "geocode-forward"],
      ["app/api/reverse-geocode/route.ts", "geocode-reverse"],
      ["app/api/push/subscriptions/route.ts", "push-subscription"],
      ["app/api/push/test/route.ts", "push-test"],
    ] as const;

    for (const [path, scope] of targets) {
      const source = read(path);
      expect(source).not.toContain("new Map<");
      expect(source).toContain("consumeSecurityRateLimit");
      expect(source).toContain(scope);
      expect(source).toContain("Retry-After");
    }
  });
});
