import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android native secret boundary v2", () => {
  it("never serializes the installation credential from new native status", () => {
    const status = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/NativeStatus.java");
    expect(status).toContain('"native-secret-private-v2"');
    expect(status).not.toContain('.put("credential"');
  });

  it("uses native-owned enrollment for v2 while retaining an explicit legacy compatibility branch", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const nativeWeb = source("lib/android/native-web.ts");

    expect(nativeWeb).toContain("supportsNativeSecretPrivate");
    expect(nativeWeb).toContain('capabilities.includes("native-secret-private-v2")');
    expect(provider).toContain('send("native.authority.enroll"');
    expect(provider).toContain('message.type === "native.authority.enroll.result"');
    expect(provider).toContain("supportsNativeSecretPrivate(status)");
  });

  it("correlates native enrollment completion with the initiating web account and generations", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    expect(provider).toContain("type NativeEnrollmentAttempt");
    expect(provider).toContain("sessionUserIdRef.current !== attempt.userId");
    expect(provider).toContain("syncGenerationRef.current !== attempt.syncGeneration");
    expect(provider).toContain("nestedStatus.accountGeneration !== attempt.accountGeneration");
  });

  it("treats an authority-only orphan as account state only for private-secret v2", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const helper = provider.slice(
      provider.indexOf("function hasLegacyNativeState"),
      provider.indexOf("function accountRequiresReset"),
    );
    expect(helper).toContain("supportsNativeSecretPrivate(status) && status?.authorityId");
  });

  it("accepts the private native credential in a header without requiring it in the enrollment body", () => {
    const enroll = source("app/api/android/native-authority/enroll/route.ts");
    expect(enroll).toContain('request.headers.get("x-native-credential")');
    expect(enroll).toContain("const credential = headerCredential || body?.credential");
    expect(enroll).toContain("hashNativeCredential(credential)");
    expect(enroll).toContain("credentialMatches(credential");
  });

  it("queues native revocation across account reset and required-update transitions", () => {
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const store = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");
    const work = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeWork.java");
    const worker = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeAuthorityWorker.java");

    expect(store).toContain("resetAccountStateAndQueueAuthorityRevocation");
    expect(store).toContain("pendingAuthorityRevocation");
    expect(bridge.match(/resetAccountStateAndQueueAuthorityRevocation\(\)/gu)?.length).toBe(2);
    expect(bridge.match(/NativeWork\.flushAuthorityRevocation\(context\)/gu)?.length).toBe(2);
    expect(work).toContain("AUTHORITY_REVOCATION");
    expect(worker).toContain('"Authorization", "Native " + store.credential()');
    expect(worker).toContain("store.accountGeneration() != pending.targetGeneration");
  });
});
