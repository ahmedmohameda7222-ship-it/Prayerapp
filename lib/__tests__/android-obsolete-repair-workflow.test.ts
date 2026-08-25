import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Android release workflow hardening", () => {
  it("does not retain the one-shot Android 1.0.1 metadata repair workflow", () => {
    expect(
      existsSync(join(process.cwd(), ".github/workflows/android-repair-v1.0.1-metadata-once.yml")),
    ).toBe(false);
  });
});
