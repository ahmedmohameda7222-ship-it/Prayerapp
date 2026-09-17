import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAzkarSourceRevisionTimestamps } from "./azkar";
import { getMasjidDisplayGeneratedAt } from "./masjid-display-generated-at";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: mocks.from }),
}));

const SOURCE_TIMESTAMP = "2026-06-01T10:00:00.000Z";
const CURRENT_AZKAR_ITEM_ID = "morning-praise-allah-alone";
const CURRENT_AZKAR_SOURCE_REVISION = "2026-08-22T21:46:19.000Z";

beforeEach(() => {
  mocks.from.mockReset();
  mocks.from.mockImplementation(() => ({
    select: vi.fn(() => ({
      in: vi.fn(async (_column: string, ids: string[]) => ({
        data: ids.map(() => ({ updated_at: SOURCE_TIMESTAMP })),
        error: null,
      })),
    })),
  }));
});

describe("Azkar generatedAt source revisions", () => {
  it("uses an explicit deterministic source timestamp for represented hardcoded Azkar", () => {
    expect(getAzkarSourceRevisionTimestamps([CURRENT_AZKAR_ITEM_ID])).toEqual([
      CURRENT_AZKAR_SOURCE_REVISION,
    ]);
  });

  it("is stable for unchanged represented Azkar source revisions", async () => {
    const revisions = getAzkarSourceRevisionTimestamps([CURRENT_AZKAR_ITEM_ID]);
    const sources = {
      prayerIds: ["prayer-1"],
      jumuahIds: [],
      announcementIds: [],
      eventIds: [],
      campaignIds: [],
      azkarRevisionTimestamps: revisions,
    };

    const first = await getMasjidDisplayGeneratedAt(sources, "2026-05-31T22:00:00.000Z");
    const second = await getMasjidDisplayGeneratedAt(sources, "2026-05-31T22:00:00.000Z");

    expect(first).toBe(CURRENT_AZKAR_SOURCE_REVISION);
    expect(second).toBe(first);
  });

  it("changes deterministically when the represented selected Azkar source revision changes", async () => {
    const baseSources = {
      prayerIds: ["prayer-1"],
      jumuahIds: [],
      announcementIds: [],
      eventIds: [],
      campaignIds: [],
      azkarRevisionTimestamps: [CURRENT_AZKAR_SOURCE_REVISION],
    };
    const changedRevision = "2026-09-18T08:15:00.000Z";

    const original = await getMasjidDisplayGeneratedAt(baseSources, "2026-05-31T22:00:00.000Z");
    const changed = await getMasjidDisplayGeneratedAt(
      { ...baseSources, azkarRevisionTimestamps: [changedRevision] },
      "2026-05-31T22:00:00.000Z",
    );

    expect(original).toBe(CURRENT_AZKAR_SOURCE_REVISION);
    expect(changed).toBe(changedRevision);
  });

  it("does not include an unrelated unselected Azkar item revision", () => {
    expect(getAzkarSourceRevisionTimestamps([CURRENT_AZKAR_ITEM_ID])).toHaveLength(1);
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
        azkarRevisionTimestamps: [],
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
        azkarRevisionTimestamps: [],
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
