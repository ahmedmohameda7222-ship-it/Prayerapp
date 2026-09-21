import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Android workflow SDK setup", () => {
  it("never relies on the obsolete setup-android tools package default", () => {
    const workflow = readFileSync(".github/workflows/android-twa.yml", "utf8");
    const setupBlocks = workflow
      .split(/\n(?=      - name: |      - uses: )/)
      .filter((block) => block.includes("android-actions/setup-android@"));

    expect(setupBlocks.length).toBeGreaterThan(0);
    for (const block of setupBlocks) {
      expect(block).toContain("packages: \"platform-tools\"");
    }
  });
});
