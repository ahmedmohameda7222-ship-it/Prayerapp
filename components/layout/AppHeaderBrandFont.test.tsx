import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("mosque name header brand mark", () => {
  it("renders the Arabic brand as inline SVG so it is available in the first header render", () => {
    const header = source("components/layout/AppHeader.tsx");

    expect(header).not.toContain('import Image from "next/image"');
    expect(header).toContain('const useArabicBrandLogo = !title && locale === "ar";');
    expect(header).toContain("{useArabicBrandLogo ? (");
    expect(header).toContain('<svg');
    expect(header).toContain('viewBox="0 0 1852 584"');
    expect(header).toContain('aria-label={APP_NAMES.ar}');
    expect(header).toContain('className="mosque-name-logo h-auto w-[clamp(190px,54vw,230px)]"');
    expect(header).toContain('fill="#F2EBDD"');
    expect(header).not.toContain('src="/brand/masjid-al-donau.svg"');
    expect(existsSync(join(process.cwd(), "public/brand/masjid-al-donau.svg"))).toBe(false);
  });

  it("keeps the old localized text header for non-Arabic languages and custom titles", () => {
    const header = source("components/layout/AppHeader.tsx");

    expect(header).toContain('<h1 lang={locale} className="text-[28px] font-bold leading-tight text-[#F2EBDD]">');
    expect(header).toContain("{mosqueName}");
  });

  it("keeps Quran and donation Arabic typography on the existing Naskh stack", () => {
    const css = source("app/globals.css");
    expect(css).toMatch(/\.home-page-shell \.home-quran-text,[\s\S]*?\.home-page-shell \.home-donation-verse[\s\S]*?Noto Naskh Arabic/);
  });
});
