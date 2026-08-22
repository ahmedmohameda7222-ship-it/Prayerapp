import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android native authority generation", () => {
  it("rotates a persisted authority id on enrollment and scopes heartbeat mutations to it", () => {
    const migration = source("supabase/migrations/20260822203500_android_native_authority_generation.sql");
    const enroll = source("app/api/android/native-authority/enroll/route.ts");
    const heartbeat = source("app/api/android/native-authority/heartbeat/route.ts");

    expect(migration).toContain("authority_id uuid not null default gen_random_uuid()");
    expect(enroll).toContain("randomUUID");
    expect(enroll).toContain("authority_id: authorityId");
    expect(heartbeat).toContain('select("credential_hash, authority_id")');
    expect(heartbeat).toContain('.eq("authority_id", row.authority_id)');
  });
});
