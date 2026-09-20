import { describe, expect, it } from "vitest";
import {
  displayAzkarSerializedBytes,
  MAX_MASJID_DISPLAY_AZKAR_BYTES,
  selectDisplayAzkar,
} from "./azkar-selection";
import type { AzkarItem } from "@/lib/types";

const azkar = (id: string, category: AzkarItem["category"], sortOrder: number, isPublished = true): AzkarItem => ({
  id,
  category,
  arabicText: `ذكر ${id}`,
  transliteration: "Dhikr",
  translationEn: "Dhikr",
  translationDe: `Dhikr ${id}`,
  translationTr: "Dhikr",
  source: "Synthetic",
  repeatCount: 3,
  sortOrder,
  isPublished,
});

describe("selectDisplayAzkar", () => {
  it("projects all selected published Azkar needed for offline category changes", () => {
    const all = [
      azkar("morning-a", "Morning", 1),
      azkar("evening-b", "Evening", 2),
      azkar("sleep-c", "Sleep", 3),
    ];
    const result = selectDisplayAzkar(all, ["morning-a", "evening-b", "unknown"]);
    expect(result.map((item) => item.id)).toEqual(["morning-a", "evening-b"]);
    expect(result.map((item) => item.category)).toEqual(["Morning", "Evening"]);
  });

  it("excludes unpublished items and ignores duplicate playlist IDs", () => {
    const all = [azkar("morning-a", "Morning", 1), azkar("private-b", "Evening", 2, false)];
    expect(selectDisplayAzkar(all, ["morning-a", "morning-a", "private-b"]).map((item) => item.id)).toEqual(["morning-a"]);
  });

  it("measures the exact serialized public Azkar projection against the reserved envelope", () => {
    const projected = selectDisplayAzkar(
      [
        {
          ...azkar("large", "Morning", 1),
          arabicText: "ا".repeat(20_000),
          translationDe: "x".repeat(30_000),
        },
      ],
      ["large"],
    );
    expect(displayAzkarSerializedBytes(projected)).toBeGreaterThan(
      MAX_MASJID_DISPLAY_AZKAR_BYTES,
    );
  });

  it("preserves canonical dataset order rather than request order", () => {
    const all = [azkar("a", "Morning", 10), azkar("b", "Evening", 20)];
    expect(selectDisplayAzkar(all, ["b", "a"]).map((item) => item.id)).toEqual(["a", "b"]);
  });
});
