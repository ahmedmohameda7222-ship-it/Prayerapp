import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("CI Vitest discovery", () => {
  it("runs TypeScript Friday/Admin regression tests, not only TSX tests", () => {
    const config = readFileSync(join(process.cwd(), "vitest.config.ts"), "utf8");
    expect(config).toContain('"app/admin/**/*.test.ts"');
    expect(config).toContain('"app/admin/**/*.test.tsx"');
  });
});
