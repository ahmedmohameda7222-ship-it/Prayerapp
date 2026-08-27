import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAMES } from "@/lib/app-brand";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("AppHeader Arabic wordmark contract", () => {
  it("renders the approved Arabic wordmark from an in-DOM SVG sprite without an image request", () => {
    const header = source("components/layout/AppHeader.tsx");
    const layout = source("app/layout.tsx");
    const wordmarkPath = join(process.cwd(), "components/layout/ArabicMosqueWordmark.tsx");
    const spritePath = join(process.cwd(), "components/layout/ArabicMosqueWordmarkSprite.tsx");

    expect(header).not.toContain('from "next/image"');
    expect(header).not.toContain('/branding/masjid-al-danube-ar.svg');
    expect(header).toContain('import { ArabicMosqueWordmark } from "@/components/layout/ArabicMosqueWordmark"');
    expect(header).toContain("<ArabicMosqueWordmark />");
    expect(layout).toContain('import { ArabicMosqueWordmarkSprite } from "@/components/layout/ArabicMosqueWordmarkSprite"');
    expect(layout).toContain("<ArabicMosqueWordmarkSprite />");
    expect(existsSync(wordmarkPath)).toBe(true);
    expect(existsSync(spritePath)).toBe(true);

    const wordmark = readFileSync(wordmarkPath, "utf8");
    const sprite = readFileSync(spritePath, "utf8");
    expect(wordmark).toContain("<svg");
    expect(wordmark).toContain('data-approved-wordmark="2026-08-27-spaced"');
    expect(wordmark).toContain('href="#word-danube"');
    expect(wordmark).toContain('href="#word-masjid"');
    expect(wordmark).toContain("مَسْجِدُ الدُّونَاوْ");
    expect(wordmark).toContain("w-[clamp(220px,62vw,280px)]");
    expect(wordmark).not.toMatch(/<image\b/i);

    expect(sprite).toContain('public/branding/masjid-al-danube-ar.svg');
    expect(sprite).toContain("readFileSync");
    expect(sprite).toContain("dangerouslySetInnerHTML");
  });

  it("keeps the exact normal localized mosque names", () => {
    expect(APP_NAMES.ar).toBe("مسجد الدوناو");
    expect(APP_NAMES.en).toBe("Danube Mosque");
    expect(APP_NAMES.de).toBe("Donau-Moschee");
    expect(APP_NAMES.tr).toBe("Tuna Camii");
  });

  it("keeps the approved standalone vector source as the design authority", () => {
    const asset = source("public/branding/masjid-al-danube-ar.svg");

    expect(asset).toContain("<path");
    expect(asset).toContain("#F2EBDD");
    expect(asset).toContain("مَسْجِدُ الدُّونَاوْ");
    expect(asset).not.toMatch(/<image\b/i);
    expect(asset).not.toMatch(/<text\b/i);
    expect(asset).not.toMatch(/data:image\//i);
  });
});
