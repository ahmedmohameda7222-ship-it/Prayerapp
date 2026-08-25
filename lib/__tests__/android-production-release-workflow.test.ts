import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const workflowPath = join(repoRoot, ".github/workflows/android-production-release.yml");
const rightsManifestPath = join(repoRoot, "android-twa/adhan-rights.json");

describe("Android production release workflow policy", () => {
  it("does not gate production publishing on an Adhan rights manifest", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(existsSync(rightsManifestPath)).toBe(false);
    expect(workflow).not.toContain("Require cleared Adhan rights");
    expect(workflow).not.toContain("adhan-rights.json");
    expect(workflow).not.toContain("publicReleaseApproved");
  });

  it("retains permanent production-signing verification", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("EXPECTED_CERT_SHA256");
    expect(workflow).toContain("Reconstruct and verify permanent signing certificate");
    expect(workflow).toContain("Independently verify production artifacts");
    expect(workflow).toContain("PUBLISH_ANDROID_PRODUCTION");
    expect(workflow).toContain("test \"$head_sha\" = \"$GITHUB_SHA\"");
  });
});
