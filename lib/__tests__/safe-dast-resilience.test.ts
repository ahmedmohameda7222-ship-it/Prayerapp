import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("safe deployed DAST probe resilience", () => {
  it("retries a timed-out fetch once without retrying arbitrary failures", () => {
    const source = readFileSync("scripts/security/safe-dast.mjs", "utf8");

    expect(source).toContain("const SAFE_DAST_PROBE_ATTEMPTS = 2;");
    expect(source).toMatch(
      /for \(let attempt = 1; attempt <= SAFE_DAST_PROBE_ATTEMPTS; attempt \+= 1\)/u,
    );
    expect(source).toContain(
      'error instanceof DOMException && error.name === "TimeoutError"',
    );
    expect(source).toContain("attempt === SAFE_DAST_PROBE_ATTEMPTS");
  });
});
