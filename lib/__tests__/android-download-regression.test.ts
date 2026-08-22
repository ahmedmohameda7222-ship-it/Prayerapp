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
  });
});
