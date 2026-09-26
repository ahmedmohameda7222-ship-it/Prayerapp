import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plan 5 wake-certification integrity", () => {
  it("requires a forward device-clock jump and visibility wake before the post-wake assertion", () => {
    const source = readFileSync("lib/runtime/offline-certification.test.tsx", "utf8");

    expect(source).toContain("const beforeWakeAt = new Date(");
    expect(source).toContain("const afterWakeAt = new Date(");
    expect(source).toContain(
      "expect(afterWakeAt.getTime()).toBeGreaterThan(beforeWakeAt.getTime())",
    );
    expect(source).toContain("vi.setSystemTime(beforeWakeAt)");
    expect(source).toContain("vi.setSystemTime(afterWakeAt)");
    expect(source).toMatch(
      /vi\.setSystemTime\(afterWakeAt\)[\s\S]*document\.dispatchEvent\(new Event\("visibilitychange"\)\)[\s\S]*expect\(result\.current\.state\)/,
    );
  });
});
