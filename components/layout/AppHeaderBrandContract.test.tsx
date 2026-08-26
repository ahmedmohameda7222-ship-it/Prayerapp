import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAMES } from "@/lib/app-brand";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("AppHeader Arabic wordmark contract", () => {
  it("uses the approved external Thuluth vector and removes the legacy inline Arabic mark", () => {
    const header = source("components/layout/AppHeader.tsx");

    expect(header).toContain('/branding/masjid-al-danube-ar.svg');
    expect(header).not.toContain("function ArabicMosqueBrandMark()");
    expect(header).toContain('alt="مَسْجِدُ الدُّونَاوْ"');
  });

  it("keeps the exact normal localized mosque names", () => {
    expect(APP_NAMES.ar).toBe("مسجد الدوناو");
    expect(APP_NAMES.en).toBe("Danube Mosque");
    expect(APP_NAMES.de).toBe("Donau-Moschee");
    expect(APP_NAMES.tr).toBe("Tuna Camii");
  });

  it("ships the approved standalone vector path without a raster or font dependency", () => {
    const asset = source("public/branding/masjid-al-danube-ar.svg");

    expect(asset).toContain("<path");
    expect(asset).toContain("#F2EBDD");
    expect(asset).toContain("مَسْجِدُ الدُّونَاوْ");
    expect(asset).not.toMatch(/<image\b/i);
    expect(asset).not.toMatch(/<text\b/i);
    expect(asset).not.toMatch(/data:image\//i);
  });
});
