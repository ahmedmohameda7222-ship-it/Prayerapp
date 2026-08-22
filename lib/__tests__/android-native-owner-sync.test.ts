import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const provider = () => readFileSync(join(process.cwd(), "components/providers/NativeAndroidProvider.tsx"), "utf8");

describe("Android native owner synchronization", () => {
  it("does not configure a fresh native install before successful account enrollment establishes ownership", () => {
    const source = provider();
    expect(source).toContain("const configuredOwnerId = localStorage.getItem(NATIVE_ACCOUNT_OWNER_KEY)");
    expect(source).toContain("configuredOwnerId !== sessionUserId");
  });

  it("invalidates local native work before waiting for remote authority revocation", () => {
    const source = provider();
    const transition = source.indexOf("accountTransitioningRef.current = true");
    const localReset = source.indexOf('send("native.account.reset")', transition);
    const remoteRevoke = source.indexOf('await fetch("/api/android/native-authority/heartbeat"', transition);
    expect(transition).toBeGreaterThanOrEqual(0);
    expect(localReset).toBeGreaterThan(transition);
    expect(remoteRevoke).toBeGreaterThan(localReset);
    expect(source).toContain("nativeResetCompleteRef");
    expect(source).toContain("remoteRevocationCompleteRef");
    expect(source).toContain("finishAccountTransition");
  });
});
