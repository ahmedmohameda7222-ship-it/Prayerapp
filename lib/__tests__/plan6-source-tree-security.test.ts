import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Plan 6 source-tree scan security", () => {
  it("enumerates directory entry types without a separate stat check", () => {
    const testSource = source("lib/__tests__/plan6-prayer-timezone-authority.test.ts");

    expect(testSource).toContain("withFileTypes: true");
    expect(testSource).not.toContain("statSync");
  });
});
