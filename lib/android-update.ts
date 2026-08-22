export type AndroidUpdateKind = "current" | "optional" | "required";

export function classifyAndroidUpdate(
  installedVersionCode: number,
  release: { versionCode: number; minimumSupportedVersionCode: number },
): AndroidUpdateKind {
  if (installedVersionCode >= release.versionCode) return "current";
  return installedVersionCode < release.minimumSupportedVersionCode ? "required" : "optional";
}
