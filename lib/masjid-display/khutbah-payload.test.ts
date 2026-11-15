import { describe, expect, it } from "vitest";
import { publishedGermanKhutbah } from "./khutbah-payload";

describe("Friday TV German-only payload", () => {
  it("exposes only German title and body from a published Friday khutbah", () => {
    const value = publishedGermanKhutbah({
      published: true, date: "2026-09-18",
      title_de: "Die Bedeutung des Gebets",
      content_de: "Erster Abschnitt. Zweiter Abschnitt.",
      title_ar: "خُطبة عربية", content_ar: "نص عربي",
      title_en: "English", content_en: "No English in TV",
      content_tr: "No Turkish", token: "secret",
    }, "2026-09-18");
    expect(value).toEqual({
      date: "2026-09-18",
      titleDe: "Die Bedeutung des Gebets",
      contentDe: "Erster Abschnitt. Zweiter Abschnitt.",
    });
    expect(JSON.stringify(value)).not.toMatch(/عربي|English|Turkish|secret/);
  });

  it("hides unpublished, empty-German and wrong-date sermons", () => {
    const valid = { published: true, date: "2026-09-18", title_de: "Freitag", content_de: "Die Predigt" };
    expect(publishedGermanKhutbah({ ...valid, published: false }, valid.date)).toBeNull();
    expect(publishedGermanKhutbah({ ...valid, content_de: "  " }, valid.date)).toBeNull();
    expect(publishedGermanKhutbah(valid, "2026-09-25")).toBeNull();
    expect(publishedGermanKhutbah(null, valid.date)).toBeNull();
  });

  it("does not silently truncate a sermon beyond the supported Admin max", () => {
    expect(publishedGermanKhutbah({
      published: true, date: "2026-09-18", title_de: "Friday",
      content_de: "x".repeat(50_001),
    }, "2026-09-18")).toBeNull();
  });
});
