import "server-only";
import { createHash } from "node:crypto";
import twaManifest from "@/android-twa/twa-manifest.json";
import {
  ANDROID_APK_ASSET_NAME,
  ANDROID_CERTIFICATE_SHA256,
  ANDROID_PACKAGE_ID,
  type AndroidRelease,
} from "@/lib/android-release";
import { getLatestAndroidRelease } from "@/lib/android-release-server";

const GITHUB_OWNER = "ahmedmohameda7222-ship-it";
const GITHUB_REPOSITORY = "Prayerapp";
const UPSTREAM_TIMEOUT_MS = 20_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const ALLOWED_FINAL_HOSTS = new Set([
  "github.com",
  "release-assets.githubusercontent.com",
  "objects.githubusercontent.com",
]);

export const ANDROID_APK_MAX_BYTES = 32 * 1024 * 1024;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type AndroidApkDownloadDependencies = {
  releaseLoader?: () => Promise<AndroidRelease | null>;
  fetchImpl?: FetchLike;
  method?: "GET" | "HEAD";
};

function canonicalApkUrl(tagName: string) {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/releases/download/${tagName}/${ANDROID_APK_ASSET_NAME}`;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function releaseMatchesApprovedApp(release: AndroidRelease) {
  const expectedTag = `android-v${twaManifest.versionName}`;
  const expectedUrl = canonicalApkUrl(expectedTag);
  return release.packageId === ANDROID_PACKAGE_ID
    && release.versionName === twaManifest.versionName
    && release.versionCode === twaManifest.versionCode
    && release.minimumSupportedVersionCode === twaManifest.minimumSupportedVersionCode
    && release.tagName === expectedTag
    && release.apkAsset === ANDROID_APK_ASSET_NAME
    && release.certificateSha256 === ANDROID_CERTIFICATE_SHA256
    && SHA256_PATTERN.test(release.apkSha256)
    && positiveInteger(release.apkSize)
    && release.apkSize <= ANDROID_APK_MAX_BYTES
    && release.downloadUrl === expectedUrl;
}

function finalUpstreamUrlAllowed(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_FINAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function errorResponse(status: 502 | 503) {
  return new Response("The Android application download is temporarily unavailable.", {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function readBoundedBody(response: Response, expectedSize: number, expectedSha256: string) {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength !== expectedSize || parsedLength > ANDROID_APK_MAX_BYTES) {
      return null;
    }
  }

  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  const hash = createHash("sha256");
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value || value.byteLength === 0) continue;
    total += value.byteLength;
    if (total > expectedSize || total > ANDROID_APK_MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    hash.update(value);
    chunks.push(value);
  }

  if (total !== expectedSize || hash.digest("hex") !== expectedSha256) return null;

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function serveVerifiedAndroidApk(
  dependencies: AndroidApkDownloadDependencies = {},
) {
  const releaseLoader = dependencies.releaseLoader
    ?? (() => getLatestAndroidRelease({ fresh: true }));
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const method = dependencies.method ?? "GET";

  let release: AndroidRelease | null;
  try {
    release = await releaseLoader();
  } catch {
    return errorResponse(503);
  }
  if (!release || !releaseMatchesApprovedApp(release)) return errorResponse(503);

  const upstreamUrl = canonicalApkUrl(release.tagName);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetchImpl(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/vnd.android.package-archive, application/octet-stream;q=0.9" },
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    if (upstream.status !== 200 || !finalUpstreamUrlAllowed(upstream.url)) return errorResponse(502);

    const bytes = await readBoundedBody(upstream, release.apkSize, release.apkSha256);
    if (!bytes) return errorResponse(502);

    const headers = {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": `attachment; filename="danube-mosque-${release.versionName}.apk"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ETag: `"sha256-${release.apkSha256}"`,
    };

    return new Response(method === "HEAD" ? null : bytes, {
      status: 200,
      headers,
    });
  } catch {
    return errorResponse(503);
  } finally {
    clearTimeout(timeout);
  }
}
