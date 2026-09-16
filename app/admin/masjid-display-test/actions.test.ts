import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getTestState: vi.fn(),
  getMosqueSettings: vi.fn(),
  requireAdmin: vi.fn(),
  beginAudit: vi.fn(),
  completeAudit: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/admin-server", () => ({ requireAllowedAdminIdentity: mocks.requireAdmin }));
vi.mock("@/lib/data/masjid-display-test-state", () => ({ getMasjidDisplayTestState: mocks.getTestState }));
vi.mock("@/lib/data/mosque-settings", () => ({ getMosqueSettings: mocks.getMosqueSettings }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: () => ({ from: mocks.from }) }));
vi.mock("@/lib/security/admin-audit", () => ({
  adminActionError: (error: unknown, fallback = "error") => error instanceof Error ? error.message : fallback,
  beginAdminAudit: mocks.beginAudit,
  completeAdminAudit: mocks.completeAudit,
}));

import { extendTestScenario, startTestScenario, stopTestScenario } from "./actions";

function testState() {
  return {
    enabled: true,
    scenario: "normal" as const,
    payload: {
      scenario: "normal" as const,
      id: "test-normal",
      titleAr: "اختبار",
      titleDe: "Test",
      messageAr: "رسالة",
      messageDe: "Nachricht",
    },
    startedAt: "2099-09-16T18:00:00.000Z",
    expiresAt: "2099-09-16T18:15:00.000Z",
    updatedAt: "2099-09-16T18:00:00.000Z",
  };
}

describe("Masjid Display Test Mode mutation isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.beginAudit.mockResolvedValue({ id: "audit" });
    mocks.completeAudit.mockImplementation(async (_audit, result) => result);
    mocks.getMosqueSettings.mockResolvedValue({ publicAppUrl: "https://prayer.example/" });
    mocks.getTestState.mockResolvedValue(testState());

    mocks.from.mockImplementation((table: string) => {
      if (table !== "masjid_display_test_state") throw new Error(`unexpected table: ${table}`);
      return {
        upsert: vi.fn((payload: Record<string, unknown>) => ({
          error: null,
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { updated_at: payload.updated_at }, error: null })),
          })),
        })),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      };
    });
  });

  it("starts, extends, and stops using only masjid_display_test_state", async () => {
    await expect(startTestScenario("token", "normal")).resolves.toMatchObject({ success: true });
    await expect(extendTestScenario("token")).resolves.toMatchObject({ success: true });
    await expect(stopTestScenario("token")).resolves.toMatchObject({ success: true });

    expect(mocks.from).toHaveBeenCalledTimes(3);
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "masjid_display_test_state",
      "masjid_display_test_state",
      "masjid_display_test_state",
    ]);
  });

  it("has no production prayer/feed or content-table dependency", () => {
    const source = readFileSync(path.join(process.cwd(), "app/admin/masjid-display-test/actions.ts"), "utf8");
    expect(source).not.toMatch(/getPrayerSettings|buildMasjidDisplayFeed|getPrayerTimes/);
    expect(source).not.toMatch(/\.from\(["'](?:prayer_times|announcements|events|donation_campaigns)["']\)/);
  });
});
