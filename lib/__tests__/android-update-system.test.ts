import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android direct-APK update system", () => {
  it("publishes signed, derived machine metadata in the protected release workflow", () => {
    const workflow = source(".github/workflows/android-production-release.yml");
    expect(workflow).toContain("android-release.json");
    expect(workflow).toContain('minimum_supported_version_code="$(jq -r ".minimumSupportedVersionCode"');
    expect(workflow).toContain('apk_sha256="$(sha256sum candidate/danube-mosque.apk');
    expect(workflow).toContain("packageId: $packageId");
    expect(workflow).toContain("versionCode: $versionCode");
    expect(workflow).toContain("certificateSha256: $certificateSha256");
    expect(workflow).toContain("candidate/android-release.json");
    expect(workflow).toContain('test "$VERSION_CODE" -gt "$previous_version_code"');
  });

  it("shares one server-side release resolver between metadata and the canonical APK route", () => {
    const api = source("app/api/android/release/route.ts");
    const canonicalDownload = source("app/download/android/danube-mosque.apk/route.ts");
    const legacyDownload = source("app/download/android/route.ts");
    expect(api).toContain("getLatestAndroidRelease");
    expect(canonicalDownload).toContain("getLatestAndroidRelease");
    expect(canonicalDownload).toContain("application/vnd.android.package-archive");
    expect(canonicalDownload).toContain('attachment; filename="danube-mosque.apk"');
    expect(legacyDownload).toContain("ANDROID_PUBLIC_DOWNLOAD_PATH");
    expect(api).toContain("downloadUrl: ANDROID_PUBLIC_DOWNLOAD_PATH");
    expect(api).toContain("s-maxage=300");
  });

  it("reports the installed package version from Android PackageInfo", () => {
    const status = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/NativeStatus.java");
    const web = source("lib/android/native-web.ts");
    expect(status).toContain("getPackageInfo(context.getPackageName(), 0)");
    expect(status).toContain("getLongVersionCode()");
    expect(status).toContain('put("versionCode"');
    expect(status).toContain('put("versionName"');
    expect(web).toContain("versionCode: number");
    expect(web).toContain("versionName: string");
  });

  it("checks only verified native TWA installs on launch, resume, throttle, and manual request", () => {
    const provider = source("components/providers/AndroidUpdateProvider.tsx");
    const layout = source("app/layout.tsx");
    expect(layout).toContain("<AndroidUpdateProvider>");
    expect(provider).toContain("useNativeAndroid()");
    expect(provider).toContain("visibilitychange");
    expect(provider).toContain("UPDATE_CHECK_INTERVAL_MS");
    expect(provider).toContain("window.location.href = ANDROID_PUBLIC_DOWNLOAD_PATH");
    expect(provider).toContain("dismissUpdate");
    expect(provider).toContain("suspendNativeAuthority");
    const nativeProvider = source("components/providers/NativeAndroidProvider.tsx");
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const protocol = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeProtocol.java");
    expect(nativeProvider).toContain('send("native.update.required")');
    expect(bridge).toContain('case "native.update.required"');
    expect(protocol).toContain('"native.update.required"');
  });

  it("does not re-enroll native authority while a required update is active", () => {
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

  it("uses the next immutable Android version after the published v1.0.1 code 4", () => {
    const manifest = JSON.parse(source("android-twa/twa-manifest.json")) as Record<string, unknown>;
    expect(manifest.versionCode).toBe(5);
    expect(manifest.versionName).toBe("1.0.2");
    expect(manifest.minimumSupportedVersionCode).toBe(3);
  });
});
