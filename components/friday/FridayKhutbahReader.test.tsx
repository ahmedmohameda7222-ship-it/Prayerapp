import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAvailableKhutbahLanguages,
  getDefaultKhutbahLanguage,
  getKhutbahContentForLanguage,
} from "@/lib/friday-khutbah";
import type { FridayKhutbah } from "@/lib/types";

function khutbah(overrides: Partial<FridayKhutbah> = {}): FridayKhutbah {
  return {
    id: "khutbah-1",
    date: "2026-08-28",
    published: true,
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z",
    ...overrides,
  };
}

describe("Friday khutbah reader language selection", () => {
  it("offers only Arabic and Turkish and makes no automatic selection for German locale", () => {
    const item = khutbah({ contentAr: "نص عربي", contentTr: "Türkçe metin" });

    expect(getAvailableKhutbahLanguages(item)).toEqual(["ar", "tr"]);
    expect(getDefaultKhutbahLanguage(item, "de")).toBeNull();
  });

  it("auto-selects Turkish when Turkish content exists and the app locale is Turkish", () => {
    const item = khutbah({ contentTr: "Türkçe metin" });

    expect(getAvailableKhutbahLanguages(item)).toEqual(["tr"]);
    expect(getDefaultKhutbahLanguage(item, "tr")).toBe("tr");
  });

  it("offers only English and German and makes no automatic selection for Arabic locale", () => {
    const item = khutbah({ contentEn: "English text", contentDe: "Deutscher Text" });

    expect(getAvailableKhutbahLanguages(item)).toEqual(["en", "de"]);
    expect(getDefaultKhutbahLanguage(item, "ar")).toBeNull();
  });

  it("does not make title-only languages available", () => {
    const item = khutbah({ titleAr: "عنوان", contentEn: "English text" });

    expect(getAvailableKhutbahLanguages(item)).toEqual(["en"]);
  });

  it("returns exact selected-language content without cross-language fallback", () => {
    const item = khutbah({
      titleAr: "عنوان عربي",
      contentAr: "النص العربي",
      contentEn: "English text",
    });

    expect(getKhutbahContentForLanguage(item, "ar")).toEqual({
      title: "عنوان عربي",
      content: "النص العربي",
    });
    expect(getKhutbahContentForLanguage(item, "de")).toBeNull();
  });

  it("preserves long-form readability, selection, line breaks, and narrow-screen overflow safety", () => {
    const reader = readFileSync(join(process.cwd(), "components/friday/FridayKhutbahReader.tsx"), "utf8");

    expect(reader).toContain("max-w-[760px]");
    expect(reader).toContain("select-text");
    expect(reader).toContain("whitespace-pre-wrap");
    expect(reader).toContain("break-words");
    expect(reader).toContain('const contentDirection = selectedLanguage === "ar" ? "rtl" : "ltr"');
    expect(reader).toContain("dir={contentDirection}");
    expect(reader).toContain("lang={selectedLanguage}");
  });

  it("applies selected-language direction and wrapping to the khutbah title as well as content", () => {
    const reader = readFileSync(join(process.cwd(), "components/friday/FridayKhutbahReader.tsx"), "utf8");

    expect(reader).toContain("dir={selectedLanguage ? contentDirection : undefined}");
    expect(reader).toContain("lang={selectedLanguage || locale}");
    expect(reader).toContain('className="mt-2 break-words');
  });

  it("uses repository-defined UI brand tokens instead of undefined app-brand variables", () => {
    const reader = readFileSync(join(process.cwd(), "components/friday/FridayKhutbahReader.tsx"), "utf8");

    expect(reader).toContain("var(--ui-brand)");
    expect(reader).toContain("var(--ui-brand-strong)");
    expect(reader).toContain("var(--ui-brand-soft)");
    expect(reader).not.toContain("--app-brand");
  });

  it("does not nest a second main landmark inside AppShell", () => {
    const reader = readFileSync(join(process.cwd(), "components/friday/FridayKhutbahReader.tsx"), "utf8");

    expect(reader).not.toContain("<main");
    expect(reader).not.toContain("</main>");
  });
});
