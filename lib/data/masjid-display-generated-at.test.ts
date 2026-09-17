import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMasjidDisplayGeneratedAt } from "./masjid-display-generated-at";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: mocks.from }),
}));

const SOURCE_TIMESTAMP = "2026-09-10T10:00:00.000Z";

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

describe("getMasjidDisplayGeneratedAt", () => {
  it("uses the latest represented source timestamp even when it predates the local-day fallback", async () => {
    const generatedAt = await getMasjidDisplayGeneratedAt(
      {
        prayerIds: ["prayer-1"],
        jumuahIds: [],
        announcementIds: [],
        eventIds: [],
        campaignIds: [],
      },
      "2026-09-15T00:00:00.000Z",
    );

    expect(generatedAt).toBe(SOURCE_TIMESTAMP);
  });

  it("queries only represented dynamic IDs while always including singleton settings authorities", async () => {
    await getMasjidDisplayGeneratedAt(
      {
        prayerIds: ["prayer-in-window"],
        jumuahIds: ["jumuah-represented"],
        announcementIds: ["announcement-represented"],
        eventIds: [],
        campaignIds: ["campaign-represented"],
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
