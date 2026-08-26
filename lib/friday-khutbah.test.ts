import { describe, expect, it } from "vitest";
import { hasPublishableKhutbahContent, normalizeKhutbahForm } from "@/lib/friday-khutbah";

describe("Friday khutbah publish validation", () => {
  it("allows an empty draft to normalize while keeping it unpublishable", () => {
    const draft = normalizeKhutbahForm({});
    expect(draft).toEqual({
      titleAr: "",
      contentAr: "",
      titleEn: "",
      contentEn: "",
      titleDe: "",
      contentDe: "",
      titleTr: "",
      contentTr: "",
    });
    expect(hasPublishableKhutbahContent(draft)).toBe(false);
  });

  it("allows Arabic content alone", () => {
    expect(hasPublishableKhutbahContent({ contentAr: "الحمد لله" })).toBe(true);
  });

  it("allows Turkish content alone", () => {
    expect(hasPublishableKhutbahContent({ contentTr: "Hutbe metni" })).toBe(true);
  });

  it("rejects titles without content", () => {
    expect(hasPublishableKhutbahContent({ titleEn: "Friday reminder" })).toBe(false);
  });

  it("rejects whitespace-only content", () => {
    expect(hasPublishableKhutbahContent({ contentAr: "  \n  ", contentDe: "\t" })).toBe(false);
  });

  it("trims every persisted field without inventing translations", () => {
    expect(normalizeKhutbahForm({
      titleAr: "  عنوان  ",
      contentAr: "  نص عربي\n  ",
      titleEn: " ",
      contentTr: "  Türkçe metin  ",
    })).toMatchObject({
      titleAr: "عنوان",
      contentAr: "نص عربي",
      titleEn: "",
      contentEn: "",
      contentTr: "Türkçe metin",
    });
  });
});
