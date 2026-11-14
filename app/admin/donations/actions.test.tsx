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

import { createDonationCampaignAction, toggleActiveCampaignAction } from "./actions";

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


const completeCampaign = {
  titleAr: "تبرع للمسجد",
  titleEn: "",
  titleDe: "Spende für die Moschee",
  titleTr: "",
  descriptionAr: "وصف الحملة",
  descriptionEn: "",
  descriptionDe: "Spendenaktion für die Moschee",
  descriptionTr: "",
  targetAmount: "250",
  collectedAmount: "0",
  startDate: "2026-11-14",
  endDate: "",
  donationUrl: "",
  isActive: "true",
  isFeatured: "false",
};

describe("Donation campaign creation validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.beginAudit.mockResolvedValue({ id: "audit" });
    mocks.completeAudit.mockImplementation(async (_audit, result) => result);
  });

  it("identifies target amount instead of returning a generic invalid input error", async () => {
    const result = await createDonationCampaignAction("token", {
      ...completeCampaign,
      targetAmount: "0",
    });

    expect(result).toEqual({
      success: false,
      error: "admin.errors.positiveTargetRequired",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("identifies an invalid end-date range instead of a generic invalid input error", async () => {
    const result = await createDonationCampaignAction("token", {
      ...completeCampaign,
      endDate: "2026-11-13",
    });

    expect(result).toEqual({
      success: false,
      error: "admin.errors.endDateAfterStart",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("identifies an HTTP donation URL rather than a generic error", async () => {
    const result = await createDonationCampaignAction("token", {
      ...completeCampaign,
      donationUrl: "http://example.com/donate",
    });

    expect(result).toEqual({
      success: false,
      error: "admin.errors.validHttpsUrlRequired",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("creates a valid active bilingual campaign with optional fields empty", async () => {
    let inserted: Record<string, unknown> | null = null;
    mocks.from.mockReturnValueOnce({
      insert: vi.fn((data: Record<string, unknown>) => {
        inserted = data;
        return {
          select: () => ({
            single: async () => ({
              data: { id: "00000000-0000-4000-8000-000000000001", title: data.title, is_active: true },
              error: null,
            }),
          }),
        };
      }),
    });
    mocks.sendAdminContentPush.mockResolvedValue(undefined);

    const result = await createDonationCampaignAction("token", completeCampaign);

    expect(result).toEqual({ success: true });
    expect(inserted).toMatchObject({
      title_ar: completeCampaign.titleAr,
      title_de: completeCampaign.titleDe,
      description_de: completeCampaign.descriptionDe,
      target_amount: 250,
      collected_amount: 0,
      is_active: true,
    });
  });
});
