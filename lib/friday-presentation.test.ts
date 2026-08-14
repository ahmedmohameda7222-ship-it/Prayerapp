import { describe, expect, it } from "vitest";
import { getFridayPresentation } from "@/lib/friday-presentation";
import type { JumuahTime } from "@/lib/types";

function item(id: string, overrides: Partial<JumuahTime> = {}): JumuahTime {
  return {
    id,
    date: "2026-08-21",
    khutbahTime: "13:00",
    prayerTime: "13:30",
    language: "Legacy language",
    notes: "Legacy note",
    published: true,
    ...overrides,
  };
}

describe("Friday localized presentation", () => {
  it("uses the canonical localized fields for language and notes", () => {
    const result = getFridayPresentation([
      item("one", {
        languageDe: "Deutsch / Arabisch",
        notesDe: "Bitte früh kommen.",
        languageEn: "English / Arabic",
        notesEn: "Please arrive early.",
      }),
    ], "de");

    expect(result.items[0]?.language).toBe("Deutsch / Arabisch");
    expect(result.items[0]?.note).toBe("Bitte früh kommen.");
    expect(result.sharedNote).toBe("Bitte früh kommen.");
  });

  it("shares one location only when every service has the same location key", () => {
    const result = getFridayPresentation([
      item("one", { locationName: "Masjid El-Rahman", locationAddress: "Auwiesenweg 19, 94469 Deggendorf" }),
      item("two", { locationName: "Masjid El-Rahman", locationAddress: "Auwiesenweg 19, 94469 Deggendorf" }),
      item("three", { locationName: "Masjid El-Rahman", locationAddress: "Auwiesenweg 19, 94469 Deggendorf" }),
    ], "en");

    expect(result.sharedLocation).toEqual({
      name: "Masjid El-Rahman",
      address: "Auwiesenweg 19, 94469 Deggendorf",
    });
    expect(result.items.every((entry) => !entry.showOwnLocation)).toBe(true);
  });

  it("supports a shared name-only or address-only location without inventing missing fields", () => {
    const nameOnly = getFridayPresentation([
      item("one", { locationName: "Masjid El-Rahman" }),
      item("two", { locationName: "Masjid El-Rahman" }),
    ], "en");
    const addressOnly = getFridayPresentation([
      item("one", { locationAddress: "Auwiesenweg 19, 94469 Deggendorf" }),
      item("two", { locationAddress: "Auwiesenweg 19, 94469 Deggendorf" }),
    ], "en");

    expect(nameOnly.sharedLocation).toEqual({ name: "Masjid El-Rahman", address: "" });
    expect(addressOnly.sharedLocation).toEqual({ name: "", address: "Auwiesenweg 19, 94469 Deggendorf" });
  });

  it("keeps differing and partially missing locations with their own services", () => {
    const result = getFridayPresentation([
      item("one", { locationName: "Masjid El-Rahman", locationAddress: "Auwiesenweg 19" }),
      item("two", { locationName: "Community Hall", locationAddress: "Long German street address 123, 94469 Deggendorf" }),
      item("three"),
    ], "tr");

    expect(result.sharedLocation).toBeUndefined();
    expect(result.items.map((entry) => entry.showOwnLocation)).toEqual([true, true, false]);
  });

  it("shares a note only when every localized non-empty note matches", () => {
    const shared = getFridayPresentation([
      item("one", { notesAr: "يرجى الحضور مبكرًا" }),
      item("two", { notesAr: "يرجى الحضور مبكرًا" }),
    ], "ar");
    const different = getFridayPresentation([
      item("one", { notesTr: "Lütfen erken gelin." }),
      item("two", { notesTr: "İkinci cemaat üst kattadır." }),
    ], "tr");

    expect(shared.sharedNote).toBe("يرجى الحضور مبكرًا");
    expect(shared.items.every((entry) => !entry.showOwnNote)).toBe(true);
    expect(different.sharedNote).toBe("");
    expect(different.items.map((entry) => entry.showOwnNote)).toEqual([true, true]);
  });

  it("renders no shared note when an optional note is missing from one service", () => {
    const result = getFridayPresentation([
      item("one", { notesEn: "Please arrive early." }),
      item("two", { notes: "", notesEn: "" }),
    ], "en");

    expect(result.sharedNote).toBe("");
    expect(result.items[0]?.showOwnNote).toBe(true);
    expect(result.items[1]?.showOwnNote).toBe(false);
  });
});
