import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const canonicalDownloadPath = "/download/android/danube-mosque.apk";

describe("Android direct APK distribution regression", () => {
  it("publishes non-null release metadata from workflow variables", () => {
    const workflow = source(".github/workflows/android-production-release.yml");
    expect(workflow).toContain("packageId: $packageId");
    expect(workflow).toContain("versionCode: $versionCode");
    expect(workflow).toContain("versionName: $versionName");
    expect(workflow).toContain("minimumSupportedVersionCode: $minimumSupportedVersionCode");
    expect(workflow).toContain("publishedAt: $publishedAt");
    expect(workflow).toContain("apkAsset: $apkAsset");
    expect(workflow).toContain("apkSha256: $apkSha256");
    expect(workflow).toContain("certificateSha256: $certificateSha256");
  });

  it("uses an APK-named same-origin URL as the public download contract", () => {
    const release = source("lib/android-release.ts");
    const api = source("app/api/android/release/route.ts");
    expect(release).toContain(canonicalDownloadPath);
    expect(api).toContain("ANDROID_PUBLIC_DOWNLOAD_PATH");
  });

  it("serves the canonical APK-named endpoint with download identity before redirecting", () => {
    const routePath = join(root, "app/download/android/danube-mosque.apk/route.ts");
    expect(existsSync(routePath)).toBe(true);
    if (!existsSync(routePath)) return;
    const route = readFileSync(routePath, "utf8");
    expect(route).toContain("application/vnd.android.package-archive");
    expect(route).toContain('attachment; filename="danube-mosque.apk"');
    expect(route).toContain("getLatestAndroidRelease");
    expect(route).toContain("export async function HEAD");
  });

  it("keeps the legacy extensionless endpoint as compatibility only", () => {
    const legacy = source("app/download/android/route.ts");
    expect(legacy).toContain("ANDROID_PUBLIC_DOWNLOAD_PATH");
    expect(legacy).not.toContain("selected.downloadUrl");
    expect(legacy).not.toContain("getLatestAndroidRelease");
  });

  it("smoke-tests public metadata separately from signed release metadata", () => {
    const smoke = source(".github/workflows/android-download-smoke.yml");
    expect(smoke).toContain(canonicalDownloadPath);
    expect(smoke).toContain("/api/android/release");
    expect(smoke).toContain("gh release download");
    expect(smoke).toContain("expected_sha");
    expect(smoke).toContain("content-disposition");
    expect(smoke).toContain("unzip -t");
    expect(smoke).toContain("release:");
    expect(smoke).toContain("types: [published]");
    expect(smoke).toContain("workflow_dispatch:");
    expect(smoke).toContain("startsWith(github.event.release.tag_name, 'android-v')");
    expect(smoke).not.toContain('      - "android-twa/twa-manifest.json"');
    expect(smoke).toContain('      - "lib/android-release-server.ts"');
  });

  it("accepts only a selected release whose code and name match the expected app identity", async () => {
    const releaseModule = await import("@/lib/android-release");
    const matcher = (releaseModule as {
      matchesExpectedAndroidRelease?: (
        release: Record<string, unknown> | null,
        expected: { versionCode: number; versionName: string },
      ) => boolean;
    }).matchesExpectedAndroidRelease;

    expect(matcher).toBeTypeOf("function");
    if (!matcher) return;

    const selected = {
      packageId: "de.donaumoschee.app",
      versionCode: 5,
      versionName: "1.0.2",
      minimumSupportedVersionCode: 3,
      publishedAt: "2026-08-24T12:00:00Z",
      apkAsset: "danube-mosque.apk",
      apkSha256: "a".repeat(64),
      certificateSha256: "E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92",
      tagName: "android-v1.0.2",
      downloadUrl: "https://github.com/example/releases/download/android-v1.0.2/danube-mosque.apk",
    };

    expect(matcher(selected, { versionCode: 5, versionName: "1.0.2" })).toBe(true);
    expect(matcher(selected, { versionCode: 6, versionName: "1.0.2" })).toBe(false);
    expect(matcher(selected, { versionCode: 5, versionName: "1.0.3" })).toBe(false);
    expect(matcher(null, { versionCode: 5, versionName: "1.0.2" })).toBe(false);
  });

  it("fails the public release closed when GitHub's selected release does not match twa-manifest identity", () => {
    const server = source("lib/android-release-server.ts");
    expect(server).toContain('import twaManifest from "@/android-twa/twa-manifest.json"');
    expect(server).toContain("matchesExpectedAndroidRelease");
    expect(server).toContain("versionCode: twaManifest.versionCode");
    expect(server).toContain("versionName: twaManifest.versionName");
  });
});
