import { describe, expect, it, vi } from "vitest";
import type { AzkarItem } from "@/lib/types";
import { selectDisplayAzkar } from "@/lib/masjid-display/azkar-selection";
import type { DisplayAzkarDto } from "@/lib/masjid-display/feed-contract";
import { getMasjidDisplayGeneratedAt } from "./masjid-display-generated-at";

vi.mock("server-only", () => ({}));

const SOURCE_TIMESTAMP = "2026-06-01T10:00:00.000Z";
const FALLBACK_TIMESTAMP = "2026-05-31T22:00:00.000Z";

const SELECTED_AZKAR: AzkarItem = {
  id: "selected-morning",
  category: "Morning",
  arabicText: "سبحان الله",
  transliteration: "Subhan Allah",
  translationEn: "Glory be to Allah",
  translationDe: "Gepriesen sei Allah",
  source: "Synthetic",
  repeatCount: 3,
  sortOrder: 1,
  isPublished: true,
};

const UNSELECTED_AZKAR: AzkarItem = {
  id: "unselected-evening",
  category: "Evening",
  arabicText: "الحمد لله",
  transliteration: "Alhamdulillah",
  translationEn: "Praise be to Allah",
  translationDe: "Alles Lob gebührt Allah",
  source: "Synthetic",
  repeatCount: 3,
  sortOrder: 2,
  isPublished: true,
};

function projectSelected(catalog: AzkarItem[]): DisplayAzkarDto[] {
  return selectDisplayAzkar(catalog, [SELECTED_AZKAR.id]);
}

async function generatedAtFor(azkar: DisplayAzkarDto[], fallbackIso = FALLBACK_TIMESTAMP) {
  return getMasjidDisplayGeneratedAt(
    {
      sourceTimestamps: [SOURCE_TIMESTAMP],
      azkar,
    } as never,
    fallbackIso,
  );
}

describe("Azkar generatedAt content revision", () => {
  it("keeps generatedAt stable for unchanged represented Azkar content", async () => {
    const represented = projectSelected([SELECTED_AZKAR, UNSELECTED_AZKAR]);

    const first = await generatedAtFor(represented);
    const second = await generatedAtFor(represented);

    expect(second).toBe(first);
    expect(Number.isFinite(Date.parse(first))).toBe(true);
  });

  it("changes generatedAt deterministically when represented selected Azkar content changes", async () => {
    const original = projectSelected([SELECTED_AZKAR, UNSELECTED_AZKAR]);
    const changed = projectSelected([
      { ...SELECTED_AZKAR, arabicText: "سبحان الله وبحمده" },
      UNSELECTED_AZKAR,
    ]);

    const originalGeneratedAt = await generatedAtFor(original);
    const changedGeneratedAt = await generatedAtFor(changed);
    const changedGeneratedAtAgain = await generatedAtFor(changed);

    expect(changedGeneratedAt).not.toBe(originalGeneratedAt);
    expect(changedGeneratedAtAgain).toBe(changedGeneratedAt);
  });

  it("does not change generatedAt when only an unselected catalog item changes", async () => {
    const original = projectSelected([SELECTED_AZKAR, UNSELECTED_AZKAR]);
    const catalogWithUnselectedChange = projectSelected([
      SELECTED_AZKAR,
      { ...UNSELECTED_AZKAR, translationDe: "Unrelated catalog edit" },
    ]);

    expect(catalogWithUnselectedChange).toEqual(original);
    await expect(generatedAtFor(catalogWithUnselectedChange)).resolves.toBe(
      await generatedAtFor(original),
    );
  });

  it("does not depend on the request clock", async () => {
    const represented = projectSelected([SELECTED_AZKAR]);
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date("2026-09-18T08:00:00.000Z"));
      const first = await generatedAtFor(represented);

      vi.setSystemTime(new Date("2026-09-18T21:00:00.000Z"));
      const second = await generatedAtFor(represented);

      expect(second).toBe(first);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("getMasjidDisplayGeneratedAt", () => {
  it("uses the latest captured represented source timestamp even when it predates the local-day fallback", async () => {
    const generatedAt = await getMasjidDisplayGeneratedAt(
      {
        sourceTimestamps: [SOURCE_TIMESTAMP],
        azkar: [],
      } as never,
      "2026-09-15T00:00:00.000Z",
    );

    expect(Date.parse(generatedAt)).toBe(Date.parse(SOURCE_TIMESTAMP));
  });

  it("takes the maximum only across timestamps supplied by represented source reads when no Azkar is represented", async () => {
    const generatedAt = await getMasjidDisplayGeneratedAt(
      {
        sourceTimestamps: [
          "2026-06-01T10:00:00.000Z",
          "2026-07-02T11:30:00.000Z",
          "2026-06-15T08:00:00.000Z",
        ],
        azkar: [],
      } as never,
      "2026-09-15T00:00:00.000Z",
    );

    expect(generatedAt).toBe("2026-07-02T11:30:00.000Z");
  });
});
