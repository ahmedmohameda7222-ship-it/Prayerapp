import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADHAN_SOUNDS } from "@/lib/adhan-audio";

const root = process.cwd();
const rightsPath = join(root, "android-twa", "adhan-rights.json");
const workflowPath = join(root, ".github", "workflows", "android-production-release.yml");

type RightsManifest = {
  schemaVersion: number;
  publicReleaseApproved: boolean;
  reviewedAt: string;
  sounds: Array<{
    id: string;
    status: string;
    evidenceUrl: string | null;
    note: string;
  }>;
};

function rights(): RightsManifest {
  return JSON.parse(readFileSync(rightsPath, "utf8")) as RightsManifest;
}

describe("Android Adhan licensing gate", () => {
  it("keeps a machine-readable rights manifest for every Adhan catalog id", () => {
    expect(existsSync(rightsPath)).toBe(true);
    const manifest = rights();
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(manifest.sounds.map((sound) => sound.id).sort())
      .toEqual(ADHAN_SOUNDS.map((sound) => sound.id).sort());
  });

  it("does not claim public-release rights without explicit evidence", () => {
    const manifest = rights();
    expect(manifest.publicReleaseApproved).toBe(false);
    expect(manifest.sounds.every((sound) => sound.status === "unverified")).toBe(true);
    expect(manifest.sounds.every((sound) => sound.evidenceUrl === null)).toBe(true);
    expect(manifest.sounds.every((sound) => sound.note.length > 0)).toBe(true);
  });

  it("fails public production release closed until every catalog sound is cleared", () => {
    const workflow = readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("Require cleared Adhan rights");
    expect(workflow).toContain("android-twa/adhan-rights.json");
    expect(workflow).toContain(".publicReleaseApproved == true");
    expect(workflow).toContain('all(.status == "cleared")');
    expect(workflow).toContain("all(.evidenceUrl != null and (.evidenceUrl | length) > 0)");
  });
});
