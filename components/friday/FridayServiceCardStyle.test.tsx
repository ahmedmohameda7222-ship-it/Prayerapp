import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Friday service card styling", () => {
  it("rounds each Friday prayer service card without changing its content structure", () => {
    const css = source("app/globals.css");
    const rowRule = css.match(/\.friday-service-row\s*\{([\s\S]*?)\}/)?.[1] || "";

    expect(rowRule).toContain("border-radius: 14px;");
    expect(rowRule).toContain("overflow: hidden;");
  });
});
