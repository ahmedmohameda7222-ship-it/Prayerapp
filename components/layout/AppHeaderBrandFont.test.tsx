import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("mosque name header brand mark", () => {
  it("renders the default mosque brand from a responsive SVG instead of written header text", () => {
    const header = source("components/layout/AppHeader.tsx");

    expect(header).toContain('import Image from "next/image"');
    expect(header).toContain("const useBrandLogo = !title;");
    expect(header).toContain('<h1 lang={locale} className="flex justify-center">');
    expect(header).toContain('src="/brand/masjid-al-donau.svg"');
    expect(header).toContain("alt={mosqueName}");
    expect(header).toContain('width={1852}');
    expect(header).toContain('height={584}');
    expect(header).toContain('className="mosque-name-logo h-auto w-[clamp(190px,54vw,230px)]"');
    expect(header).not.toContain("mosque-name-thuluth");
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

  it("keeps Quran and donation Arabic typography on the existing Naskh stack", () => {
    const css = source("app/globals.css");
    expect(css).toMatch(/\.home-page-shell \.home-quran-text,[\s\S]*?\.home-page-shell \.home-donation-verse[\s\S]*?Noto Naskh Arabic/);
  });
});
