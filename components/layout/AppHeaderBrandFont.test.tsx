import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Arabic mosque name brand mark", () => {
  it("renders the canonical Arabic mosque name from a dedicated SVG instead of the Thuluth webfont", () => {
    const header = source("components/layout/AppHeader.tsx");
    const css = source("app/globals.css");

    expect(header).toContain('import Image from "next/image"');
    expect(header).toContain('const useArabicBrandLogo = locale === "ar" && mosqueName === APP_NAMES.ar;');
    expect(header).toContain('src="/brand/masjid-al-donau.svg"');
    expect(header).toContain("alt={mosqueName}");
    expect(header).toContain('className="mosque-name-logo"');
    expect(header).not.toContain("mosque-name-thuluth");
    expect(css).toContain(".home-page-shell .mosque-name-logo");
    expect(css).not.toContain('font-family: "Donau Thuluth"');
    expect(css).not.toContain(".home-page-shell .mosque-name-thuluth");
  });

  it("bundles the exact mosque name as an accessible cream vector asset", () => {
    const logoPath = "public/brand/masjid-al-donau.svg";

    expect(existsSync(join(process.cwd(), logoPath))).toBe(true);

    const logo = source(logoPath);
    expect(logo).toContain('<title id="title">مسجد الدوناو</title>');
    expect(logo).toContain('viewBox="0 0 1852 584"');
    expect(logo).toContain('fill="#F2EBDD"');
    expect(logo).not.toContain("<text");
  });

  it("removes the obsolete dedicated Thuluth font assets", () => {
    expect(existsSync(join(process.cwd(), "public/fonts/donau-thuluth.woff2"))).toBe(false);
    expect(existsSync(join(process.cwd(), "public/fonts/OFL-Layla-Thuluth.txt"))).toBe(false);
  });

  it("keeps Quran and donation Arabic typography on the existing Naskh stack", () => {
    const css = source("app/globals.css");
    expect(css).toMatch(/\.home-page-shell \.home-quran-text,[\s\S]*?\.home-page-shell \.home-donation-verse[\s\S]*?Noto Naskh Arabic/);
  });
});
