import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Arabic mosque name typography", () => {
  it("uses a dedicated self-hosted Thuluth face only for the canonical Arabic mosque name", () => {
    const header = source("components/layout/AppHeader.tsx");
    const css = source("app/globals.css");

    expect(header).toContain('locale === "ar" && mosqueName === APP_NAMES.ar');
    expect(header).toContain("mosque-name-thuluth");
    expect(css).toContain('@font-face');
    expect(css).toContain('font-family: "Donau Thuluth"');
    expect(css).toContain('url("/fonts/donau-thuluth.woff2")');
    expect(css).toContain(".home-page-shell .mosque-name-thuluth");
    expect(existsSync(join(process.cwd(), "public/fonts/donau-thuluth.woff2"))).toBe(true);
    expect(existsSync(join(process.cwd(), "public/fonts/OFL-Layla-Thuluth.txt"))).toBe(true);
  });

  it("gives the canonical Arabic brand a restrained display treatment without synthetic weight or wrapping", () => {
    const header = source("components/layout/AppHeader.tsx");
    const css = source("app/globals.css");

    expect(header).toContain('"mosque-name-thuluth text-[#F2EBDD]"');
    expect(css).toContain("font-size: clamp(42px, 11.5vw, 54px)");
    expect(css).toContain("line-height: 1.22");
    expect(css).toContain("white-space: nowrap");
    expect(css).toContain("font-synthesis: none");
    expect(css).toContain("text-rendering: optimizeLegibility");
  });

  it("keeps Quran and donation Arabic typography on the existing Naskh stack", () => {
    const css = source("app/globals.css");
    expect(css).toMatch(/\.home-page-shell \.home-quran-text,[\s\S]*?\.home-page-shell \.home-donation-verse[\s\S]*?Noto Naskh Arabic/);
  });
});
