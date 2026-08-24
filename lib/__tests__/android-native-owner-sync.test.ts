import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const provider = () => source("components/providers/NativeAndroidProvider.tsx");

describe("Android native owner synchronization", () => {
  it("does not configure a fresh native install before successful account enrollment establishes ownership", () => {
    const value = provider();
    expect(value).toContain("const configuredOwnerId = localStorage.getItem(NATIVE_ACCOUNT_OWNER_KEY)");
    expect(value).toContain("configuredOwnerId !== sessionUserId");
    expect(value).toContain("supportsNativeSecretPrivate(status)");
    expect(value).toContain("status?.receiptV2 !== true");
  });

  it("invalidates local native work and delegates authority revocation to the bounded native reset", () => {
    const value = provider();
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const transition = value.indexOf("accountTransitioningRef.current = true");
    const localReset = value.indexOf('send("native.account.reset")', transition);
    expect(transition).toBeGreaterThanOrEqual(0);
    expect(localReset).toBeGreaterThan(transition);
    expect(value).not.toContain('fetch("/api/android/native-authority/heartbeat"');
    expect(value).not.toContain("status.credential");
    expect(value).toContain("nativeResetCompleteRef");
    expect(value).toContain("remoteRevocationCompleteRef");
    expect(value).toContain("finishAccountTransition");
    expect(bridge).toContain("resetAccountStateAndQueueAuthorityRevocation");
    expect(bridge).toContain("NativeWork.flushAuthorityRevocation(context)");
  });
});
