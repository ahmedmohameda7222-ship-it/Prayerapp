import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("mosque name header brand mark", () => {
  it("uses the approved standalone Arabic Thuluth SVG asset", () => {
    const header = source("components/layout/AppHeader.tsx");

    expect(header).toContain('import Image from "next/image"');
    expect(header).toContain('const useArabicBrandLogo = !title && locale === "ar";');
    expect(header).toContain("{useArabicBrandLogo ? (");
    expect(header).toContain('src="/branding/masjid-al-danube-ar.svg"');
    expect(header).toContain('alt="مَسْجِدُ الدُّونَاوْ"');
    expect(header).toContain('className="mosque-name-logo h-auto w-[clamp(190px,54vw,230px)]"');
    expect(header).not.toContain("function ArabicMosqueBrandMark()");
    expect(existsSync(join(process.cwd(), "public/branding/masjid-al-danube-ar.svg"))).toBe(true);
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
