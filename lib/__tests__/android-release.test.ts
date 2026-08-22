import { describe, expect, it } from "vitest";
import {
  ANDROID_APK_ASSET_NAME,
  ANDROID_CERTIFICATE_SHA256,
  ANDROID_PACKAGE_ID,
  ANDROID_PUBLIC_DOWNLOAD_PATH,
  ANDROID_RELEASE_METADATA_ASSET_NAME,
  parsePublicAndroidRelease,
  selectLatestAndroidRelease,
  type AndroidReleaseMetadata,
  type GitHubRelease,
} from "@/lib/android-release";

const apkDigest = "a".repeat(64);

const metadata = (overrides: Partial<AndroidReleaseMetadata> = {}): AndroidReleaseMetadata => ({
  packageId: ANDROID_PACKAGE_ID,
  versionCode: 4,
  versionName: "1.0.1",
  minimumSupportedVersionCode: 3,
  publishedAt: "2026-08-22T20:00:00Z",
  apkAsset: ANDROID_APK_ASSET_NAME,
  apkSha256: apkDigest,
  certificateSha256: ANDROID_CERTIFICATE_SHA256,
  ...overrides,
});

const release = (overrides: Partial<GitHubRelease> = {}): GitHubRelease => ({
  id: 1,
  tag_name: "android-v1.0.1",
  draft: false,
  prerelease: false,
  published_at: "2026-08-22T20:01:00Z",
  assets: [
    {
      name: ANDROID_APK_ASSET_NAME,
      browser_download_url: "https://github.com/example/releases/download/android-v1.0.1/danube-mosque.apk",
      digest: `sha256:${apkDigest}`,
    },
    {
      name: ANDROID_RELEASE_METADATA_ASSET_NAME,
      browser_download_url: "https://github.com/example/releases/download/android-v1.0.1/android-release.json",
      digest: `sha256:${"b".repeat(64)}`,
    },
  ],
  ...overrides,
});

describe("Android release selection", () => {
  it("selects by validated integer versionCode rather than publication ordering", () => {
    const olderHighCode = release({ id: 1, tag_name: "android-v1.1.0", published_at: "2026-08-20T00:00:00Z" });
    const newerLowCode = release({ id: 2, tag_name: "android-v1.0.1", published_at: "2026-08-22T00:00:00Z" });
    const selected = selectLatestAndroidRelease([newerLowCode, olderHighCode], {
      "android-v1.1.0": metadata({ versionCode: 5, versionName: "1.1.0" }),
      "android-v1.0.1": metadata({ versionCode: 4, versionName: "1.0.1" }),
    });

    expect(selected).toEqual(expect.objectContaining({
      tagName: "android-v1.1.0",
      versionCode: 5,
      versionName: "1.1.0",
      downloadUrl: olderHighCode.assets[0].browser_download_url,
    }));
  });

  it("ignores malformed, draft, prerelease, unsigned, missing-asset, and non-Android releases", () => {
    expect(selectLatestAndroidRelease([
      release({ draft: true }),
      release({ prerelease: true }),
      release({ tag_name: "v1.0.1" }),
      release({ tag_name: "android-v1.0.1-rc.1" }),
      release({ assets: [{ name: "danube-mosque-debug.apk", browser_download_url: "https://github.com/debug.apk" }] }),
    ], {
      "android-v1.0.1": metadata({ certificateSha256: "00:11" }),
    })).toBeNull();
  });

  it("rejects metadata whose tag, package, APK digest, or version bounds do not match", () => {
    expect(selectLatestAndroidRelease([release()], {
      "android-v1.0.1": metadata({ packageId: "example.invalid" }),
    })).toBeNull();
    expect(selectLatestAndroidRelease([release()], {
      "android-v1.0.1": metadata({ versionName: "1.0.2" }),
    })).toBeNull();
    expect(selectLatestAndroidRelease([release()], {
      "android-v1.0.1": metadata({ apkSha256: "c".repeat(64) }),
    })).toBeNull();
    expect(selectLatestAndroidRelease([release()], {
      "android-v1.0.1": metadata({ minimumSupportedVersionCode: 5 }),
    })).toBeNull();
  });

  it("fails closed on ambiguous duplicate version codes", () => {
    expect(selectLatestAndroidRelease([
      release({ id: 1, tag_name: "android-v1.0.1" }),
      release({ id: 2, tag_name: "android-v1.0.2" }),
    ], {
      "android-v1.0.1": metadata(),
      "android-v1.0.2": metadata({ versionName: "1.0.2" }),
    })).toBeNull();
  });

  it("bootstraps only the immutable independently verified v1.0.0 release", () => {
    const selected = selectLatestAndroidRelease([release({
      tag_name: "android-v1.0.0",
      published_at: "2026-08-22T18:17:11Z",
      assets: [{
        name: ANDROID_APK_ASSET_NAME,
        browser_download_url: "https://github.com/ahmedmohameda7222-ship-it/Prayerapp/releases/download/android-v1.0.0/danube-mosque.apk",
        digest: "sha256:c56a6c93325bff9c9ee6d796eec068fa300dafe2cdbdfe5d9c688ef13d006be3",
      }],
    })], {});

    expect(selected).toEqual(expect.objectContaining({ versionCode: 3, versionName: "1.0.0" }));
  });

  it("parses only public same-origin update metadata", () => {
    expect(parsePublicAndroidRelease({
      packageId: ANDROID_PACKAGE_ID,
      versionCode: 4,
      versionName: "1.0.1",
      minimumSupportedVersionCode: 3,
      publishedAt: "2026-08-22T20:01:00Z",
      downloadUrl: ANDROID_PUBLIC_DOWNLOAD_PATH,
    })).toEqual(expect.objectContaining({ versionCode: 4 }));
    expect(parsePublicAndroidRelease({
      packageId: ANDROID_PACKAGE_ID,
      versionCode: "4",
      versionName: "1.0.1",
      minimumSupportedVersionCode: 3,
      publishedAt: "bad-date",
      downloadUrl: "https://attacker.example/app.apk",
    })).toBeNull();
  });
});
