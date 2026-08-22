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
    expect(enroll).toContain("authorityId: enrolled.authority_id");
    expect(heartbeat).toContain('select("credential_hash, authority_id")');
    expect(heartbeat).toContain('request.headers.get("x-native-authority-id")');
    expect(heartbeat).toContain('.eq("authority_id", row.authority_id)');
    expect(heartbeat).toContain('.eq("credential_hash", row.credential_hash)');
    expect(heartbeat).toContain('.select("authority_id")');
    expect(heartbeat).toContain("authorityId != null && !isAuthorityId(authorityId)");
  });

  it("persists the enrolled authority generation in native storage and sends it on heartbeats", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const protocol = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeProtocol.java");
    const store = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");
    const worker = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeRefreshWorker.java");

    expect(provider).toContain('send("native.authority.bind"');
    expect(bridge).toContain('case "native.authority.bind"');
    expect(protocol).toContain('"native.authority.bind"');
    expect(store).toContain("AUTHORITY_ID");
    expect(store).toContain("bindAuthorityId");
    expect(worker).toContain('"X-Native-Authority-Id", authorityId');
  });
});
