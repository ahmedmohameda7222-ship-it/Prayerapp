import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getAzkarItems: vi.fn(),
  beginAudit: vi.fn(),
  completeAudit: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/admin-server", () => ({
  requireAllowedAdminIdentity: vi.fn(),
}));
vi.mock("@/lib/data/azkar", () => ({ getAzkarItems: mocks.getAzkarItems }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: mocks.from }),
}));
vi.mock("@/lib/security/admin-audit", () => ({
  adminActionError: (error: unknown, fallback = "error") =>
    error instanceof Error ? error.message : fallback,
  beginAdminAudit: mocks.beginAudit,
  completeAdminAudit: mocks.completeAudit,
}));

import { saveMasjidDisplaySettingsAction } from "./actions";

describe("Masjid Display Admin Azkar capacity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.beginAudit.mockResolvedValue({ id: "audit" });
    mocks.completeAudit.mockImplementation(async (_audit, result) => result);
    mocks.getAzkarItems.mockResolvedValue([
      {
        id: "huge-azkar",
        category: "Morning",
        arabicText: "ا".repeat(20_000),
        transliteration: "",
        translationEn: "",
        translationDe: "x".repeat(30_000),
        source: "Synthetic",
        repeatCount: 1,
        sortOrder: 1,
        isPublished: true,
      },
    ]);
    mocks.from.mockReturnValue({
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: {
              fajr_prayer_duration_minutes: 10,
              dhuhr_prayer_duration_minutes: 10,
              asr_prayer_duration_minutes: 10,
              maghrib_prayer_duration_minutes: 10,
              isha_prayer_duration_minutes: 10,
              azkar_playlist_ids: ["huge-azkar"],
            },
            error: null,
          })),
        })),
      })),
    });
  });

  it("rejects a playlist whose public Azkar projection exceeds the reserved envelope before DB mutation", async () => {
    const result = await saveMasjidDisplaySettingsAction("token", {
      fajrPrayerDurationMinutes: 10,
      dhuhrPrayerDurationMinutes: 10,
      asrPrayerDurationMinutes: 10,
      maghribPrayerDurationMinutes: 10,
      ishaPrayerDurationMinutes: 10,
      azkarPlaylistIds: ["huge-azkar"],
    });

    expect(result).toMatchObject({
      success: false,
      error: expect.stringMatching(/Azkar playlist exceeds maximum display size/i),
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
