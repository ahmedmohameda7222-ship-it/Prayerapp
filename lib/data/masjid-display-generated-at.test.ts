import { beforeEach, describe, expect, it, vi } from "vitest";
import { selectDisplayAzkar } from "@/lib/masjid-display/azkar-selection";
import { getMasjidDisplayGeneratedAt, withAzkarContentRevision } from "./masjid-display-generated-at";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: mocks.from }),
}));

const SOURCE_TIMESTAMP = "2026-09-10T10:00:00.000Z";

const azkarCatalog = () => [
  {
    id: "selected-azkar",
    category: "Morning" as const,
    arabicText: "سبحان الله",
    transliteration: "Subhan Allah",
    translationEn: "Glory be to Allah",
    translationDe: "Gepriesen sei Allah",
    source: "Synthetic",
    repeatCount: 3,
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: "unselected-azkar",
    category: "Evening" as const,
    arabicText: "الحمد لله",
    transliteration: "Alhamdulillah",
    translationEn: "Praise be to Allah",
    translationDe: "Alles Lob gebührt Allah",
    source: "Synthetic",
    repeatCount: 3,
    sortOrder: 2,
    isPublished: true,
  },
];

function generatedAtForCatalog(catalog = azkarCatalog()) {
  const represented = selectDisplayAzkar(catalog, ["selected-azkar"]);
  return withAzkarContentRevision(SOURCE_TIMESTAMP, represented);
}

beforeEach(() => {
  mocks.from.mockReset();
  mocks.from.mockImplementation((table: string) => ({
    select: vi.fn(() => ({
      in: vi.fn(async (_column: string, ids: string[]) => ({
        data: ids.map(() => ({ updated_at: SOURCE_TIMESTAMP })),
        error: null,
      })),
    })),
  }));
});

describe("withAzkarContentRevision", () => {
  it("is stable for unchanged represented Azkar without request-time entropy", () => {
    const first = generatedAtForCatalog();
    const second = generatedAtForCatalog();

    expect(first).toBe(second);
    expect(Number.isFinite(Date.parse(first))).toBe(true);
    expect(Date.parse(first)).toBe(Date.parse(SOURCE_TIMESTAMP));
  });

  it("changes deterministically when represented selected Azkar content changes", () => {
    const changed = azkarCatalog();
    changed[0] = { ...changed[0], arabicText: "سبحان الله وبحمده" };

    const original = generatedAtForCatalog();
    const firstChanged = generatedAtForCatalog(changed);
    const secondChanged = generatedAtForCatalog(changed);

    expect(firstChanged).not.toBe(original);
    expect(firstChanged).toBe(secondChanged);
  });

  it("ignores changes to Azkar that are not represented by this Feed snapshot", () => {
    const changed = azkarCatalog();
    changed[1] = {
      ...changed[1],
      arabicText: "غير معروض",
      translationDe: "Nicht dargestellt",
      sortOrder: 99,
    };

    expect(generatedAtForCatalog(changed)).toBe(generatedAtForCatalog());
  });
});

describe("getMasjidDisplayGeneratedAt", () => {
  it("uses the latest represented source timestamp even when it predates the local-day fallback", async () => {
    const generatedAt = await getMasjidDisplayGeneratedAt(
      {
        prayerIds: ["prayer-1"],
        jumuahIds: [],
        announcementIds: [],
        eventIds: [],
        campaignIds: [],
        azkar: [],
      },
      "2026-09-15T00:00:00.000Z",
    );

    expect(Date.parse(generatedAt)).toBe(Date.parse(SOURCE_TIMESTAMP));
  });

  it("queries only represented dynamic IDs while always including singleton settings authorities", async () => {
    await getMasjidDisplayGeneratedAt(
      {
        prayerIds: ["prayer-in-window"],
        jumuahIds: ["jumuah-represented"],
        announcementIds: ["announcement-represented"],
        eventIds: [],
        campaignIds: ["campaign-represented"],
        azkar: [],
      },
      "2026-09-15T00:00:00.000Z",
    );

    const calls = mocks.from.mock.calls.map(([table]) => table);
    expect(calls).toEqual([
      "prayer_times",
      "prayer_settings",
      "jumuah_times",
      "announcements",
      "donation_campaigns",
      "mosque_settings",
      "masjid_display_settings",
    ]);
  });
});
