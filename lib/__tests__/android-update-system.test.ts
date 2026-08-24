import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android update system", () => {
  it("serves a bounded same-origin Android release manifest", () => {
    const route = source("app/api/android/release/route.ts");
    expect(route).toContain("versionCode");
    expect(route).toContain("versionName");
    expect(route).toContain("minimumSupportedVersionCode");
    expect(route).toContain("updatePolicy");
    expect(route).toContain("downloadUrl");
    expect(route).toContain("sha256");
    expect(route).toContain("contentLength");
    expect(route).toContain("expectedSigningCertSha256");
    expect(route).not.toContain("apkUrl");
  });

  it("does not navigate Android users to an arbitrary APK URL", () => {
    const card = source("components/settings/AndroidUpdateCard.tsx");
    expect(card).toContain("/api/android/release");
    expect(card).toContain("downloadUrl");
    expect(card).toContain("expectedSigningCertSha256");
    expect(card).not.toContain("window.location.assign");
    expect(card).not.toContain("window.open");
  });

  it("requires native authority suspension before a required update can be offered", () => {
    const card = source("components/settings/AndroidUpdateCard.tsx");
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    expect(card).toContain("suspendNativeAuthority");
    expect(card).toContain("await suspendNativeAuthority()");
    expect(provider).toContain("nativeUpdateRequiredRef.current = true");
    expect(provider).toContain('send("native.update.required")');
  });

  it("gates enrollment while a required update suspension is active", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const accessTokenGate = provider.indexOf("|| !sessionAccessToken");
    const enrollmentEffectStart = provider.lastIndexOf("useEffect(() => {", accessTokenGate);
    const enrollmentGateEnd = provider.indexOf("const storedOwnerId", accessTokenGate);
    const enrollmentGate = provider.slice(enrollmentEffectStart, enrollmentGateEnd);

    expect(accessTokenGate).toBeGreaterThanOrEqual(0);
    expect(enrollmentEffectStart).toBeGreaterThanOrEqual(0);
    expect(enrollmentGateEnd).toBeGreaterThan(accessTokenGate);
    expect(enrollmentGate).toContain("nativeUpdateRequiredRef.current");
  });

  it("persists required-update suspension across a web reload", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const syncStart = provider.indexOf("const syncConfiguration = useCallback");
    const syncEnd = provider.indexOf("useEffect(() => {", syncStart);
    const syncSection = provider.slice(syncStart, syncEnd);
    const accessTokenGate = provider.indexOf("|| !sessionAccessToken");
    const enrollmentEffectStart = provider.lastIndexOf("useEffect(() => {", accessTokenGate);
    const enrollmentGateEnd = provider.indexOf("const storedOwnerId", accessTokenGate);
    const enrollmentGate = provider.slice(enrollmentEffectStart, enrollmentGateEnd);

    expect(provider).toContain("const nativeLastError = status?.lastError");
    expect(syncStart).toBeGreaterThanOrEqual(0);
    expect(syncEnd).toBeGreaterThan(syncStart);
    expect(syncSection).toContain('nativeLastError === "required-update"');
    expect(enrollmentGate).toContain('nativeLastError === "required-update"');
  });

  it("shows native-only installed/latest/update controls in Settings", () => {
    const card = source("components/settings/AndroidUpdateCard.tsx");
    const page = source("app/settings/page.tsx");
    expect(card).toContain("if (!isNative) return null");
    expect(card).toContain("installedVersionName");
    expect(card).toContain("latestVersionName");
    expect(card).toContain("checkForUpdates(true)");
    expect(page).toContain("<AndroidUpdateCard />");
  });

  it("keeps required updates in a bounded native-triggered flow", () => {
    const card = source("components/settings/AndroidUpdateCard.tsx");
    expect(card).toContain("required");
    expect(card).toContain("recommended");
    expect(card).toContain("minimumSupportedVersionCode");
  });
});
