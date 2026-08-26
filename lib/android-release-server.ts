import "server-only";
import twaManifest from "@/android-twa/twa-manifest.json";
import {
  ANDROID_RELEASE_METADATA_ASSET_NAME,
  matchesExpectedAndroidRelease,
  selectLatestAndroidRelease,
  type GitHubRelease,
} from "@/lib/android-release";

const RELEASES_API = "https://api.github.com/repos/ahmedmohameda7222-ship-it/Prayerapp/releases?per_page=50";
const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export async function getLatestAndroidRelease() {
  const response = await fetch(RELEASES_API, {
    headers: githubHeaders,
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`GitHub releases returned ${response.status}`);
  const releases = await response.json() as GitHubRelease[];
  const metadataEntries = await Promise.all(releases.map(async (release) => {
    if (release.draft || release.prerelease) return null;
    const asset = release.assets.find((item) => item.name === ANDROID_RELEASE_METADATA_ASSET_NAME);
    if (!asset) return null;
    try {
      const metadataResponse = await fetch(asset.browser_download_url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      });
      if (!metadataResponse.ok) return null;
      const text = await metadataResponse.text();
      if (text.length > 32_768) return null;
      return [release.tag_name, JSON.parse(text)] as const;
    } catch {
      return null;
    }
  }));
  const metadataByTag = Object.fromEntries(metadataEntries.filter((entry) => entry !== null));
  const selected = selectLatestAndroidRelease(releases, metadataByTag);
  return matchesExpectedAndroidRelease(selected, {
    versionCode: twaManifest.versionCode,
    versionName: twaManifest.versionName,
  }) ? selected : null;
}
