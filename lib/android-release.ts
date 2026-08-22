export const ANDROID_PACKAGE_ID = "de.donaumoschee.app";
export const ANDROID_APK_ASSET_NAME = "danube-mosque.apk";
export const ANDROID_RELEASE_METADATA_ASSET_NAME = "android-release.json";
export const ANDROID_PUBLIC_DOWNLOAD_PATH = "/download/android/danube-mosque.apk" as const;
export const ANDROID_CERTIFICATE_SHA256 =
  "E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92";

const semverPattern = /^\d+\.\d+\.\d+$/u;
const sha256Pattern = /^[0-9a-f]{64}$/u;

export type GitHubReleaseAsset = {
  name: string;
  browser_download_url: string;
  digest?: string | null;
};

export type GitHubRelease = {
  id: number;
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  assets: GitHubReleaseAsset[];
};

export type AndroidReleaseMetadata = {
  packageId: string;
  versionCode: number;
  versionName: string;
  minimumSupportedVersionCode: number;
  publishedAt: string;
  apkAsset: string;
  apkSha256: string;
  certificateSha256: string;
};

export type AndroidRelease = AndroidReleaseMetadata & {
  tagName: string;
  downloadUrl: string;
};

export type PublicAndroidRelease = Pick<AndroidRelease,
  "packageId" | "versionCode" | "versionName" | "minimumSupportedVersionCode" | "publishedAt"
> & {
  downloadUrl: typeof ANDROID_PUBLIC_DOWNLOAD_PATH;
};

const legacyV100: AndroidReleaseMetadata & { downloadUrl: string } = {
  packageId: ANDROID_PACKAGE_ID,
  versionCode: 3,
  versionName: "1.0.0",
  minimumSupportedVersionCode: 3,
  publishedAt: "2026-08-22T18:17:11Z",
  apkAsset: ANDROID_APK_ASSET_NAME,
  apkSha256: "c56a6c93325bff9c9ee6d796eec068fa300dafe2cdbdfe5d9c688ef13d006be3",
  certificateSha256: ANDROID_CERTIFICATE_SHA256,
  downloadUrl: "https://github.com/ahmedmohameda7222-ship-it/Prayerapp/releases/download/android-v1.0.0/danube-mosque.apk",
};

function isTrustedGitHubDownload(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (
      url.hostname === "github.com" || url.hostname.endsWith(".githubusercontent.com")
    );
  } catch {
    return false;
  }
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function parseMetadata(value: unknown): AndroidReleaseMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    item.packageId !== ANDROID_PACKAGE_ID
    || !positiveInteger(item.versionCode)
    || typeof item.versionName !== "string"
    || !semverPattern.test(item.versionName)
    || !positiveInteger(item.minimumSupportedVersionCode)
    || item.minimumSupportedVersionCode > item.versionCode
    || typeof item.publishedAt !== "string"
    || !Number.isFinite(Date.parse(item.publishedAt))
    || item.apkAsset !== ANDROID_APK_ASSET_NAME
    || typeof item.apkSha256 !== "string"
    || !sha256Pattern.test(item.apkSha256)
    || item.certificateSha256 !== ANDROID_CERTIFICATE_SHA256
  ) return null;
  return item as AndroidReleaseMetadata;
}

function legacyMetadata(release: GitHubRelease, apk: GitHubReleaseAsset) {
  if (
    release.tag_name !== "android-v1.0.0"
    || apk.browser_download_url !== legacyV100.downloadUrl
    || apk.digest !== `sha256:${legacyV100.apkSha256}`
  ) return null;
  return legacyV100;
}

export function selectLatestAndroidRelease(
  releases: GitHubRelease[],
  metadataByTag: Record<string, unknown> = {},
): AndroidRelease | null {
  const candidates: AndroidRelease[] = [];

  for (const release of releases) {
    if (
      release.draft
      || release.prerelease
      || !/^android-v\d+\.\d+\.\d+$/u.test(release.tag_name)
      || !release.published_at
      || !Number.isFinite(Date.parse(release.published_at))
    ) continue;
    const apk = release.assets.find((asset) => asset.name === ANDROID_APK_ASSET_NAME);
    if (!apk || !isTrustedGitHubDownload(apk.browser_download_url)) continue;

    const suppliedMetadata = parseMetadata(metadataByTag[release.tag_name]);
    const metadataAsset = release.assets.find((asset) => asset.name === ANDROID_RELEASE_METADATA_ASSET_NAME);
    const releaseMetadata = suppliedMetadata && metadataAsset && isTrustedGitHubDownload(metadataAsset.browser_download_url)
      ? suppliedMetadata
      : legacyMetadata(release, apk);
    if (
      !releaseMetadata
      || release.tag_name !== `android-v${releaseMetadata.versionName}`
      || apk.digest !== `sha256:${releaseMetadata.apkSha256}`
    ) continue;

    candidates.push({
      ...releaseMetadata,
      publishedAt: release.published_at,
      tagName: release.tag_name,
      downloadUrl: apk.browser_download_url,
    });
  }

  candidates.sort((left, right) => right.versionCode - left.versionCode);
  if (candidates.length > 1 && candidates[0].versionCode === candidates[1].versionCode) return null;
  return candidates[0] || null;
}

export function parsePublicAndroidRelease(value: unknown): PublicAndroidRelease | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    item.packageId !== ANDROID_PACKAGE_ID
    || !positiveInteger(item.versionCode)
    || typeof item.versionName !== "string"
    || !semverPattern.test(item.versionName)
    || !positiveInteger(item.minimumSupportedVersionCode)
    || item.minimumSupportedVersionCode > item.versionCode
    || typeof item.publishedAt !== "string"
    || !Number.isFinite(Date.parse(item.publishedAt))
    || item.downloadUrl !== ANDROID_PUBLIC_DOWNLOAD_PATH
  ) return null;
  return item as PublicAndroidRelease;
}
