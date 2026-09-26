import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  beginAudit: vi.fn(),
  completeAudit: vi.fn(),
  revalidatePath: vi.fn(),
  sendAdminContentPush: vi.fn(),
  updateFilters: [] as Array<[string, unknown]>,
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/data/donations", () => ({
  invalidateDonationCampaignCaches: vi.fn(),
}));
vi.mock("@/lib/push/web-push", () => ({
  sendAdminContentPush: mocks.sendAdminContentPush,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: mocks.from }),
}));
vi.mock("@/lib/security/admin-audit", () => ({
  adminActionError: (error: unknown, fallback = "error") =>
    error instanceof Error ? error.message : fallback,
  beginAdminAudit: mocks.beginAudit,
  completeAdminAudit: mocks.completeAudit,
}));

import { toggleActiveCampaignAction } from "./actions";

describe("Donation campaign activation concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateFilters.length = 0;
    mocks.beginAudit.mockResolvedValue({ id: "audit" });
    mocks.completeAudit.mockImplementation(async (_audit, result) => result);

    const current = {
      title_ar: "تبرع",
      title_de: "Spende",
      description_ar: "وصف",
      description_de: "Beschreibung",
      donation_url: "https://example.com/donate",
      updated_at: "2026-09-26T08:00:00.000Z",
    };

    const readQuery = {
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: current, error: null })),
      })),
    };

    const updateChain: Record<string, unknown> = {};
    updateChain.eq = vi.fn((field: string, value: unknown) => {
      mocks.updateFilters.push([field, value]);
      return updateChain;
    });
    updateChain.select = vi.fn(() => updateChain);
    updateChain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    updateChain.single = vi.fn(async () => ({
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        title: "تبرع",
        is_active: true,
      },
      error: null,
    }));

    mocks.from
      .mockReturnValueOnce({ select: vi.fn(() => readQuery) })
      .mockReturnValueOnce({ update: vi.fn(() => updateChain) });
  });

  it("refuses stale activation when the campaign changes after validation", async () => {
    const result = await toggleActiveCampaignAction(
      "token",
      "00000000-0000-4000-8000-000000000001",
      true,
    );

    expect(mocks.updateFilters).toContainEqual([
      "updated_at",
      "2026-09-26T08:00:00.000Z",
    ]);
    expect(result).toEqual({
      success: false,
      error: "Campaign changed concurrently; reload and retry",
    });
    expect(mocks.sendAdminContentPush).not.toHaveBeenCalled();
  });
});
