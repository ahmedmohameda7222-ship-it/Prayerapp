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
  });

  it("keeps Quran and donation Arabic typography on the existing Naskh stack", () => {
    const css = source("app/globals.css");
    expect(css).toMatch(/\.home-page-shell \.home-quran-text,[\s\S]*?\.home-page-shell \.home-donation-verse[\s\S]*?Noto Naskh Arabic/);
  });
});
