export const ANDROID_APK_ASSET_NAME = "danube-mosque.apk";

export type GitHubReleaseAsset = {
  name: string;
  browser_download_url: string;
};

export type GitHubRelease = {
  id: number;
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  assets: GitHubReleaseAsset[];
};

export type AndroidRelease = {
  tagName: string;
  publishedAt: string;
  downloadUrl: string;
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

export function selectLatestAndroidRelease(releases: GitHubRelease[]): AndroidRelease | null {
  const candidates = releases.flatMap((release) => {
    if (release.draft || release.prerelease || !/^android-v\d+\.\d+\.\d+$/u.test(release.tag_name) || !release.published_at) {
      return [];
    }
    const asset = release.assets.find((item) => item.name === ANDROID_APK_ASSET_NAME);
    if (!asset || !isTrustedGitHubDownload(asset.browser_download_url)) return [];
    const publishedAt = Date.parse(release.published_at);
    if (!Number.isFinite(publishedAt)) return [];
    return [{
      tagName: release.tag_name,
      publishedAt: release.published_at,
      publishedAtMs: publishedAt,
      downloadUrl: asset.browser_download_url,
    }];
  });

  candidates.sort((left, right) => right.publishedAtMs - left.publishedAtMs);
  const selected = candidates[0];
  if (!selected) return null;
  return {
    tagName: selected.tagName,
    publishedAt: selected.publishedAt,
    downloadUrl: selected.downloadUrl,
  };
}
