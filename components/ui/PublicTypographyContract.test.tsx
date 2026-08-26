import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const FORBIDDEN_INTERMEDIATE_WEIGHTS = /font-weight:\s*(?:560|620|650|680|720|730|740|750|760|850)\s*;/;

describe("public typography contract", () => {
  it("keeps native PWA chrome on the approved weight scale", () => {
    const css = source("app/native-pwa.css");
    expect(css).not.toMatch(FORBIDDEN_INTERMEDIATE_WEIGHTS);
  });

  it("keeps Home typography on the approved weight scale", () => {
    const responsive = source("app/responsive-prayer-nav.css");
    const home = source("app/home-palette-preview.css");
    expect(responsive).not.toMatch(FORBIDDEN_INTERMEDIATE_WEIGHTS);
    expect(home).not.toMatch(FORBIDDEN_INTERMEDIATE_WEIGHTS);
  });

  it("keeps Friday typography on the approved weight scale", () => {
    const css = source("app/friday-page.css");
    expect(css).not.toMatch(FORBIDDEN_INTERMEDIATE_WEIGHTS);
  });

  it("keeps non-Home public typography on the approved weight scale", () => {
    const css = source("app/public-ui-refresh.css");
    expect(css).not.toMatch(FORBIDDEN_INTERMEDIATE_WEIGHTS);
  });

  it("defines the semantic interface hierarchy centrally", () => {
    const css = source("app/globals.css");
    expect(css).toContain("--ui-weight-regular: 400;");
    expect(css).toContain("--ui-weight-medium: 500;");
    expect(css).toContain("--ui-weight-semibold: 600;");
    expect(css).toContain("--ui-weight-bold: 700;");
  });
});
