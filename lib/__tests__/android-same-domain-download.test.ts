import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  ANDROID_APK_MAX_BYTES,
  serveVerifiedAndroidApk,
} from "@/lib/android-apk-download-server";
import {
  ANDROID_APK_ASSET_NAME,
  ANDROID_CERTIFICATE_SHA256,
  ANDROID_PACKAGE_ID,
  type AndroidRelease,
} from "@/lib/android-release";

const APK_BYTES = new TextEncoder().encode("signed-production-apk-fixture");
const APK_SHA256 = createHash("sha256").update(APK_BYTES).digest("hex");
const CANONICAL_UPSTREAM =
  "https://github.com/ahmedmohameda7222-ship-it/Prayerapp/releases/download/android-v1.0.4/danube-mosque.apk";

function release(overrides: Partial<AndroidRelease> = {}): AndroidRelease {
  return {
    packageId: ANDROID_PACKAGE_ID,
    versionCode: 7,
    versionName: "1.0.4",
    minimumSupportedVersionCode: 3,
    publishedAt: "2026-09-03T20:24:05Z",
    apkAsset: ANDROID_APK_ASSET_NAME,
    apkSha256: APK_SHA256,
    apkSize: APK_BYTES.byteLength,
    certificateSha256: ANDROID_CERTIFICATE_SHA256,
    tagName: "android-v1.0.4",
    downloadUrl: CANONICAL_UPSTREAM,
    ...overrides,
  };
}

function upstream(bytes = APK_BYTES, contentLength = bytes.byteLength) {
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Length": String(contentLength),
    },
  });
}

describe("same-domain Android APK delivery", () => {
  it("returns the verified APK body with the required non-redirect download headers", async () => {
    const fetchImpl = vi.fn(async () => upstream());
    const response = await serveVerifiedAndroidApk({
      releaseLoader: async () => release(),
      fetchImpl,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/vnd.android.package-archive");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="danube-mosque-1.0.4.apk"',
    );
    expect(response.headers.get("location")).toBeNull();
    expect([...response.headers.values()].join(" ")).not.toMatch(/github(?:usercontent)?\.com/i);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(APK_BYTES);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(CANONICAL_UPSTREAM);
  });

  it("fails closed on an upstream hash mismatch", async () => {
    const response = await serveVerifiedAndroidApk({
      releaseLoader: async () => release({ apkSha256: "0".repeat(64) }),
      fetchImpl: async () => upstream(),
    });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).not.toContain("github");
  });

  it("fails closed before fetching when the release tag is not the manifest tag", async () => {
    const fetchImpl = vi.fn(async () => upstream());
    const response = await serveVerifiedAndroidApk({
      releaseLoader: async () => release({ tagName: "android-v1.0.5" }),
      fetchImpl,
    });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed before fetching an unexpected APK asset", async () => {
    const fetchImpl = vi.fn(async () => upstream());
    const response = await serveVerifiedAndroidApk({
      releaseLoader: async () => release({ apkAsset: "candidate.apk" }),
      fetchImpl,
    });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("turns upstream failures into a controlled server error without leaking the target", async () => {
    const response = await serveVerifiedAndroidApk({
      releaseLoader: async () => release(),
      fetchImpl: async () => {
        throw new Error("upstream connection failed");
      },
    });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).not.toMatch(/github|release-assets|objects\.githubusercontent/i);
  });

  it("rejects an oversized upstream response before reading its body", async () => {
    const response = await serveVerifiedAndroidApk({
      releaseLoader: async () => release({ apkSize: ANDROID_APK_MAX_BYTES + 1 }),
      fetchImpl: async () => upstream(APK_BYTES, ANDROID_APK_MAX_BYTES + 1),
    });

    expect(response.status).toBeGreaterThanOrEqual(500);
  });

  it("rejects a partial response whose byte count does not match release evidence", async () => {
    const response = await serveVerifiedAndroidApk({
      releaseLoader: async () => release({ apkSize: APK_BYTES.byteLength + 5 }),
      fetchImpl: async () => upstream(APK_BYTES, APK_BYTES.byteLength + 5),
    });

    expect(response.status).toBeGreaterThanOrEqual(500);
  });

  it("has no request-controlled upstream URL input and always fetches the fixed release URL", async () => {
    const fetchImpl = vi.fn(async () => upstream());
    await serveVerifiedAndroidApk({
      releaseLoader: async () => release(),
      fetchImpl,
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(CANONICAL_UPSTREAM);
    expect(CANONICAL_UPSTREAM).not.toContain("?");
  });
});
