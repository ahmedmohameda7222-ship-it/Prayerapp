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
const APPROVED_RELEASE_ASSET =
  "https://release-assets.githubusercontent.com/github-production-release-asset/1279655646/example?sp=r&sig=test";

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

function responseAt(
  url: string,
  body: BodyInit | null = null,
  init: ResponseInit = {},
) {
  const response = new Response(body, init);
  Object.defineProperty(response, "url", { value: url, configurable: true });
  return response;
}

function upstream(
  bytes = APK_BYTES,
  contentLength = bytes.byteLength,
  url = CANONICAL_UPSTREAM,
) {
  return responseAt(url, bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Length": String(contentLength),
    },
  });
}

function fetchSpy(response = upstream()) {
  return vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => response);
}

function redirectAt(url: string, location: string) {
  return responseAt(url, null, {
    status: 302,
    headers: { Location: location },
  });
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("same-domain Android APK delivery", () => {
  it("returns the verified APK body with the required non-redirect download headers", async () => {
    const fetchImpl = fetchSpy();
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
    const responseHeaders = [...response.headers.values()].join(" ").toLowerCase();
    expect(responseHeaders).not.toContain("github.com");
    expect(responseHeaders).not.toContain("githubusercontent.com");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(Array.from(APK_BYTES));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(CANONICAL_UPSTREAM);
  });

  it("bounds a stalled release-authority lookup with the same end-to-end deadline", async () => {
    vi.useFakeTimers();
    try {
      let observedSignal: AbortSignal | undefined;
      let settled: Response | undefined;
      const pending = serveVerifiedAndroidApk({
        releaseLoader: (signal?: AbortSignal) => new Promise<AndroidRelease | null>((_resolve, reject) => {
          observedSignal = signal;
          signal?.addEventListener("abort", () => reject(new Error("authority lookup aborted")), { once: true });
        }),
        fetchImpl: fetchSpy(),
      });
      void pending.then((response) => {
        settled = response;
      });

      await vi.advanceTimersByTimeAsync(20_001);
      await flushAsyncWork();

      expect(observedSignal).toBeInstanceOf(AbortSignal);
      expect(observedSignal?.aborted).toBe(true);
      expect(settled?.status).toBe(503);
      expect(settled?.headers.get("cache-control")).toContain("no-store");
    } finally {
      vi.useRealTimers();
    }
  });

  it("bounds a stalled APK fetch with the same end-to-end deadline", async () => {
    vi.useFakeTimers();
    try {
      let observedSignal: AbortSignal | null | undefined;
      let settled: Response | undefined;
      const fetchImpl = vi.fn((_input: string | URL | Request, init?: RequestInit) => (
        new Promise<Response>((_resolve, reject) => {
          observedSignal = init?.signal;
          init?.signal?.addEventListener("abort", () => reject(new Error("APK fetch aborted")), { once: true });
        })
      ));
      const pending = serveVerifiedAndroidApk({
        releaseLoader: async () => release(),
        fetchImpl,
      });
      void pending.then((response) => {
        settled = response;
      });

      await vi.advanceTimersByTimeAsync(20_001);
      await flushAsyncWork();

      expect(observedSignal).toBeInstanceOf(AbortSignal);
      expect(observedSignal?.aborted).toBe(true);
      expect(settled?.status).toBe(503);
      expect(settled?.headers.get("cache-control")).toContain("no-store");
    } finally {
      vi.useRealTimers();
    }
  });

  it("manually follows an approved GitHub to release-assets redirect", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === CANONICAL_UPSTREAM) return redirectAt(url, APPROVED_RELEASE_ASSET);
      if (url === APPROVED_RELEASE_ASSET) return upstream(APK_BYTES, APK_BYTES.byteLength, url);
      throw new Error(`unexpected URL ${url}`);
    });

    const response = await serveVerifiedAndroidApk({
      releaseLoader: async () => release(),
      fetchImpl,
    });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const call of fetchImpl.mock.calls) {
      expect(call[1]?.redirect).toBe("manual");
    }
  });

  it("rejects a redirect to an unapproved external host before that host is fetched", async () => {
    const external = "https://attacker.example/apk";
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === CANONICAL_UPSTREAM) return redirectAt(url, external);
      throw new Error("unapproved host must never be fetched");
    });

    const response = await serveVerifiedAndroidApk({ releaseLoader: async () => release(), fetchImpl });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects localhost/private redirect targets before they are fetched", async () => {
    const internal = "https://127.0.0.1/internal.apk";
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === CANONICAL_UPSTREAM) return redirectAt(url, internal);
      throw new Error("internal host must never be fetched");
    });

    const response = await serveVerifiedAndroidApk({ releaseLoader: async () => release(), fetchImpl });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects HTTPS-to-HTTP downgrade before following it", async () => {
    const downgraded = "http://release-assets.githubusercontent.com/apk";
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === CANONICAL_UPSTREAM) return redirectAt(url, downgraded);
      throw new Error("HTTP target must never be fetched");
    });

    const response = await serveVerifiedAndroidApk({ releaseLoader: async () => release(), fetchImpl });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects redirect targets containing credentials before following them", async () => {
    const credentialed = "https://user:password@release-assets.githubusercontent.com/apk";
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === CANONICAL_UPSTREAM) return redirectAt(url, credentialed);
      throw new Error("credentialed target must never be fetched");
    });

    const response = await serveVerifiedAndroidApk({ releaseLoader: async () => release(), fetchImpl });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed redirect Location", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => (
      redirectAt(String(input), "https://[")
    ));

    const response = await serveVerifiedAndroidApk({ releaseLoader: async () => release(), fetchImpl });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects redirect loops with a small bounded hop count", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => (
      redirectAt(String(input), CANONICAL_UPSTREAM)
    ));

    const response = await serveVerifiedAndroidApk({ releaseLoader: async () => release(), fetchImpl });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(fetchImpl.mock.calls.length).toBeGreaterThan(1);
    expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it("does not treat an empty or unknown final response URL as trusted", async () => {
    const fetchImpl = vi.fn(async () => new Response(APK_BYTES, {
      status: 200,
      headers: { "Content-Length": String(APK_BYTES.byteLength) },
    }));

    const response = await serveVerifiedAndroidApk({ releaseLoader: async () => release(), fetchImpl });

    expect(response.status).toBeGreaterThanOrEqual(500);
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
    const fetchImpl = fetchSpy();
    const response = await serveVerifiedAndroidApk({
      releaseLoader: async () => release({ tagName: "android-v1.0.5" }),
      fetchImpl,
    });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed before fetching an unexpected APK asset", async () => {
    const fetchImpl = fetchSpy();
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
    const errorBody = (await response.text()).toLowerCase();
    expect(errorBody).not.toContain("github");
    expect(errorBody).not.toContain("release-assets");
    expect(errorBody).not.toContain("objects.githubusercontent");
  });

  it("turns an upstream 404 into a controlled server error", async () => {
    const response = await serveVerifiedAndroidApk({
      releaseLoader: async () => release(),
      fetchImpl: async () => responseAt(CANONICAL_UPSTREAM, "not found", { status: 404 }),
    });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).not.toContain("github");
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

  it("has no request-controlled upstream URL input and always starts at the fixed release URL", async () => {
    const fetchImpl = fetchSpy();
    await serveVerifiedAndroidApk({
      releaseLoader: async () => release(),
      fetchImpl,
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(CANONICAL_UPSTREAM);
    expect(CANONICAL_UPSTREAM).not.toContain("?");
  });
});
