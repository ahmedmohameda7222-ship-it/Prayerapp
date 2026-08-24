import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android native authority generation", () => {
  it("rotates a persisted authority id on enrollment and scopes heartbeat mutations to it", () => {
    const migration = source("supabase/migrations/20260822200527_android_native_authority_generation.sql");
    const enroll = source("app/api/android/native-authority/enroll/route.ts");
    const heartbeat = source("app/api/android/native-authority/heartbeat/route.ts");
    const deleteStart = heartbeat.indexOf("export async function DELETE");
    const postSection = heartbeat.slice(0, deleteStart);
    const deleteSection = heartbeat.slice(deleteStart);

    expect(migration).toContain("authority_id uuid not null default gen_random_uuid()");
    expect(enroll).toContain("randomUUID");
    expect(enroll).toContain("authority_id: authorityId");
    expect(enroll).toContain("authorityId: enrolled.authority_id");
    expect(heartbeat).toContain('select("credential_hash, authority_id, account_generation")');
    expect(heartbeat).toContain('request.headers.get("x-native-authority-id")');
    expect(heartbeat).toContain('.eq("authority_id", row.authority_id)');
    expect(heartbeat).toContain('.eq("credential_hash", row.credential_hash)');
    expect(postSection.match(/\.is\("revoked_at", null\)/gu)?.length).toBe(2);
    expect(deleteSection.match(/\.is\("revoked_at", null\)/gu)?.length).toBe(1);
    expect(heartbeat).toContain('.select("authority_id")');
    expect(heartbeat).toContain("authorityId != null && !isAuthorityId(authorityId)");
  });

  it("persists the enrolled authority generation natively and sends it on heartbeats", () => {
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const protocol = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeProtocol.java");
    const store = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");
    const worker = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeRefreshWorker.java");

    expect(bridge).toContain("NativeAuthorityClient.enroll");
    expect(bridge).toContain("bindAuthorityIdIfGeneration");
    expect(bridge).toContain('case "native.authority.bind"');
    expect(protocol).toContain('"native.authority.bind"');
    expect(store).toContain("AUTHORITY_ID");
    expect(store).toContain("bindAuthorityIdIfGeneration");
    expect(worker).toContain('"X-Native-Authority-Id", authorityId');
  });

  it("gates enrollment on explicit native capabilities and serializes incidental status refreshes", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const nativeWeb = source("lib/android/native-web.ts");
    const status = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/NativeStatus.java");
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const protocol = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeProtocol.java");

    expect(nativeWeb).toContain("supportsNativeAuthorityGeneration");
    expect(nativeWeb).toContain('capabilities.includes("authority-generation-v1")');
    expect(nativeWeb).toContain("supportsNativeSecretPrivate");
    expect(nativeWeb).toContain('capabilities.includes("native-secret-private-v2")');
    expect(status).toContain('put("capabilities"');
    expect(status).toContain('"authority-generation-v1"');
    expect(status).toContain('"native-secret-private-v2"');
    expect(provider).toContain("supportsNativeAuthorityGeneration(status)");
    expect(provider).toContain("supportsNativeSecretPrivate(status)");
    expect(provider).toContain("enrollmentAttemptRef");
    expect(provider).toContain("const enrollmentGeneration = syncGenerationRef.current");
    expect(provider).toContain("enrollmentGeneration !== syncGenerationRef.current");
    expect(provider).not.toContain("let active = true");
    expect(provider).toContain('send("native.authority.enroll"');
    expect(bridge).toContain('case "native.authority.enroll"');
    expect(protocol).toContain('"native.authority.enroll"');
  });

  it("adds a persistent revocation tombstone migration", () => {
    const migration = source("supabase/migrations/20260822201651_android_native_authority_revocation.sql");
    expect(migration).toContain("revoked_at timestamptz");
  });
});
