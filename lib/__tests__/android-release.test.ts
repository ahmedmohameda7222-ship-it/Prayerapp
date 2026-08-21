import { describe, expect, it } from "vitest";
import {
  ANDROID_APK_ASSET_NAME,
  selectLatestAndroidRelease,
  type GitHubRelease,
} from "@/lib/android-release";

const release = (overrides: Partial<GitHubRelease> = {}): GitHubRelease => ({
  id: 1,
  tag_name: "android-v1.0.0",
  draft: false,
  prerelease: false,
  published_at: "2026-08-20T12:00:00Z",
  assets: [{ name: ANDROID_APK_ASSET_NAME, browser_download_url: "https://github.com/example/app.apk" }],
  ...overrides,
});

describe("Android release selection", () => {
  it("selects the newest public stable Android release with the exact production APK", () => {
    const selected = selectLatestAndroidRelease([
      release({ id: 1, tag_name: "android-v0.9.0", published_at: "2026-08-01T00:00:00Z" }),
      release({ id: 2, tag_name: "android-v1.0.0", published_at: "2026-08-20T00:00:00Z" }),
    ]);

    expect(selected?.tagName).toBe("android-v1.0.0");
    expect(selected?.downloadUrl).toBe("https://github.com/example/app.apk");
  });

  it("ignores drafts, prereleases, non-Android tags, and approximate asset names", () => {
    expect(selectLatestAndroidRelease([
      release({ draft: true }),
      release({ prerelease: true }),
      release({ tag_name: "v1.0.0" }),
      release({ tag_name: "android-v1.0.0-rc.1" }),
      release({ assets: [{ name: "danube-mosque-debug.apk", browser_download_url: "https://example.com/debug.apk" }] }),
    ])).toBeNull();
  });

  it("rejects non-GitHub HTTPS download URLs", () => {
    expect(selectLatestAndroidRelease([
      release({ assets: [{ name: ANDROID_APK_ASSET_NAME, browser_download_url: "https://attacker.example/app.apk" }] }),
    ])).toBeNull();
  });
});
