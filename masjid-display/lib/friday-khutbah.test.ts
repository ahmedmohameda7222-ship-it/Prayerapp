import { describe, expect, it } from "vitest";
import { parseGermanKhutbah, paginateGermanKhutbah, germanKhutbahPageIndex } from "./friday-khutbah";

describe("published TV Friday khutbah reader", () => {
  it("accepts only same-date German text and prevents untrusted extra fields", () => {
    const input = { date: "2026-09-18", khutbah: {
      date: "2026-09-18", titleDe: "Freitagspredigt",
      contentDe: "Erste Seite der Predigt.",
      contentAr: "نص عربي", secret: "do-not-publish",
    } };
    const sermon = parseGermanKhutbah(input, "2026-09-18");
    expect(sermon).toEqual({
      date: "2026-09-18", titleDe: "Freitagspredigt", contentDe: "Erste Seite der Predigt.",
    });
    expect(JSON.stringify(sermon)).not.toMatch(/نص عربي|do-not-publish/);
    expect(parseGermanKhutbah(input, "2026-09-25")).toBeNull();
    expect(parseGermanKhutbah({ date: "2026-09-18", khutbah: null }, "2026-09-18")).toBeNull();
    expect(parseGermanKhutbah({ date: "2026-09-18", khutbah: { ...input.khutbah, contentDe: "" } }, "2026-09-18")).toBeNull();
  });

  it("paginates a long German sermon without dropping or duplicating any words", () => {
    const content = Array.from({ length: 180 }, (_, i) => `Abschnitt-${i + 1}`).join(" ");
    const pages = paginateGermanKhutbah(content, 180);
    expect(pages.length).toBeGreaterThan(4);
    expect(pages.every(page => page.length <= 180)).toBe(true);
    expect(pages.join(" ")).toBe(content);
  });

  it("starts at first page per Friday service, then turns a page every 25s", () => {
    expect(germanKhutbahPageIndex(10_000, 10_000, 4)).toBe(0);
    expect(germanKhutbahPageIndex(34_999, 10_000, 4)).toBe(0);
    expect(germanKhutbahPageIndex(35_000, 10_000, 4)).toBe(1);
    expect(germanKhutbahPageIndex(110_000, 10_000, 4)).toBe(0);
  });
});
