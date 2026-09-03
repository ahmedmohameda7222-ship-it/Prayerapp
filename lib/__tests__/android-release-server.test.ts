import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANDROID_APK_ASSET_NAME,
  ANDROID_CERTIFICATE_SHA256,
  ANDROID_PACKAGE_ID,
  ANDROID_RELEASE_METADATA_ASSET_NAME,
} from "@/lib/android-release";
import { getExpectedAndroidRelease } from "@/lib/android-release-server";

const TAG = "android-v1.0.4";
const RELEASE_API =
  "https://api.github.com/repos/ahmedmohameda7222-ship-it/Prayerapp/releases/tags/android-v1.0.4";
const APK_URL =
  "https://github.com/ahmedmohameda7222-ship-it/Prayerapp/releases/download/android-v1.0.4/danube-mosque.apk";
const METADATA_URL =
  "https://github.com/ahmedmohameda7222-ship-it/Prayerapp/releases/download/android-v1.0.4/android-release.json";
const APK_SHA = "a".repeat(64);

const releaseJson = {
  id: 1,
  tag_name: TAG,
  draft: false,
  prerelease: false,
  published_at: "2026-09-03T20:24:05Z",
  assets: [
    {
      name: ANDROID_APK_ASSET_NAME,
      browser_download_url: APK_URL,
      digest: `sha256:${APK_SHA}`,
      size: 1_590_092,
    },
    {
      name: ANDROID_RELEASE_METADATA_ASSET_NAME,
      browser_download_url: METADATA_URL,
      digest: `sha256:${"b".repeat(64)}`,
      size: 512,
    },
  ],
};

const metadataJson = {
  packageId: ANDROID_PACKAGE_ID,
  versionCode: 7,
  versionName: "1.0.4",
  minimumSupportedVersionCode: 3,
  publishedAt: "2026-09-03T20:24:05Z",
  apkAsset: ANDROID_APK_ASSET_NAME,
  apkSha256: APK_SHA,
  certificateSha256: ANDROID_CERTIFICATE_SHA256,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("expected Android release authority lookup", () => {
  it("resolves only the manifest-derived exact tag with a short server cache and one AbortSignal", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === RELEASE_API) {
        return new Response(JSON.stringify(releaseJson), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === METADATA_URL) {
        return new Response(JSON.stringify(metadataJson), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`unexpected authority URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const selected = await getExpectedAndroidRelease({ signal: controller.signal });

    expect(selected).toEqual(expect.objectContaining({
      tagName: TAG,
      versionName: "1.0.4",
      versionCode: 7,
      downloadUrl: APK_URL,
      apkSha256: APK_SHA,
      apkSize: 1_590_092,
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(RELEASE_API);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(METADATA_URL);
    for (const call of fetchMock.mock.calls) {
      const init = call[1] as (RequestInit & { next?: { revalidate?: number } }) | undefined;
      expect(init?.signal).toBe(controller.signal);
      expect(init?.next?.revalidate).toBe(60);
    }
  });

  it("fails closed if the exact-tag endpoint returns stale authority for another tag", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ...releaseJson,
      tag_name: "android-v1.0.3",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const selected = await getExpectedAndroidRelease();

    expect(selected).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
