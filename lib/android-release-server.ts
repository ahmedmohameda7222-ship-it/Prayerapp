import "server-only";
import twaManifest from "@/android-twa/twa-manifest.json";
import {
  ANDROID_RELEASE_METADATA_ASSET_NAME,
  matchesExpectedAndroidRelease,
  selectLatestAndroidRelease,
  type GitHubRelease,
} from "@/lib/android-release";

const GITHUB_OWNER = "ahmedmohameda7222-ship-it";
const GITHUB_REPOSITORY = "Prayerapp";
const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/releases?per_page=50`;
const AUTHORITY_REVALIDATE_SECONDS = 60;
const DEFAULT_REVALIDATE_SECONDS = 300;
const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

type AndroidReleaseLookupOptions = {
  fresh?: boolean;
  signal?: AbortSignal;
};

type MetadataFetchOptions = {
  fresh: boolean;
  revalidateSeconds: number;
  signal?: AbortSignal;
};

function releaseByTagApi(tagName: string) {
  return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/releases/tags/${encodeURIComponent(tagName)}`;
}

function canonicalReleaseAssetUrl(tagName: string, assetName: string) {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/releases/download/${tagName}/${assetName}`;
}

function cacheOptions(fresh: boolean, revalidateSeconds: number) {
  return fresh
    ? { cache: "no-store" as const }
    : { next: { revalidate: revalidateSeconds } };
}

async function fetchReleaseMetadata(
  release: GitHubRelease,
  options: MetadataFetchOptions,
) {
  if (release.draft || release.prerelease) return null;
  const asset = release.assets.find((item) => item.name === ANDROID_RELEASE_METADATA_ASSET_NAME);
  if (!asset) return null;

  const expectedMetadataUrl = canonicalReleaseAssetUrl(
    release.tag_name,
    ANDROID_RELEASE_METADATA_ASSET_NAME,
  );
  if (asset.browser_download_url !== expectedMetadataUrl) return null;

  try {
    const metadataResponse = await fetch(expectedMetadataUrl, {
      headers: { Accept: "application/json" },
      signal: options.signal,
      ...cacheOptions(options.fresh, options.revalidateSeconds),
    });
    if (!metadataResponse.ok) return null;
    const text = await metadataResponse.text();
    if (text.length > 32_768) return null;
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return null;
  }
}

export async function getExpectedAndroidRelease(
  options: Pick<AndroidReleaseLookupOptions, "signal"> = {},
) {
  const expectedTag = `android-v${twaManifest.versionName}`;
  const response = await fetch(releaseByTagApi(expectedTag), {
    headers: githubHeaders,
    signal: options.signal,
    ...cacheOptions(false, AUTHORITY_REVALIDATE_SECONDS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub release ${expectedTag} returned ${response.status}`);

  const release = await response.json() as GitHubRelease;
  if (
    release.tag_name !== expectedTag
    || release.draft
    || release.prerelease
  ) return null;

  const metadata = await fetchReleaseMetadata(release, {
    fresh: false,
    revalidateSeconds: AUTHORITY_REVALIDATE_SECONDS,
    signal: options.signal,
  });
  if (!metadata) return null;

  const selected = selectLatestAndroidRelease([release], { [expectedTag]: metadata });
  return matchesExpectedAndroidRelease(selected, {
    versionCode: twaManifest.versionCode,
    versionName: twaManifest.versionName,
  }) ? selected : null;
}

export async function getLatestAndroidRelease(options: AndroidReleaseLookupOptions = {}) {
  const fresh = options.fresh === true;
  const response = await fetch(RELEASES_API, {
    headers: githubHeaders,
    signal: options.signal,
    ...cacheOptions(fresh, DEFAULT_REVALIDATE_SECONDS),
  });
  if (!response.ok) throw new Error(`GitHub releases returned ${response.status}`);
  const releases = await response.json() as GitHubRelease[];
  const metadataEntries = await Promise.all(releases.map(async (release) => {
    const metadata = await fetchReleaseMetadata(release, {
      fresh,
      revalidateSeconds: DEFAULT_REVALIDATE_SECONDS,
      signal: options.signal,
    });
    return metadata ? [release.tag_name, metadata] as const : null;
  }));
  const metadataByTag = Object.fromEntries(metadataEntries.filter((entry) => entry !== null));
  const selected = selectLatestAndroidRelease(releases, metadataByTag);
  return matchesExpectedAndroidRelease(selected, {
    versionCode: twaManifest.versionCode,
    versionName: twaManifest.versionName,
  }) ? selected : null;
}
