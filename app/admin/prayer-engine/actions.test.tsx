import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrayerScheduleDiff, PrayerSchedulePreview } from "@/lib/prayer-engine/generate";

const mocks = vi.hoisted(() => ({
  beginAudit: vi.fn(),
  completeAudit: vi.fn(),
  commitExtension: vi.fn(),
  commitRecalculation: vi.fn(),
  previewExtension: vi.fn(),
  previewRecalculation: vi.fn(),
  calibrate: vi.fn(),
  revalidatePath: vi.fn(),
  saveSettings: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/admin-server", () => ({
  requireAllowedAdminIdentity: vi.fn(),
}));
vi.mock("@/lib/data/prayer-settings", () => ({
  getPrayerSettings: vi.fn(),
  savePrayerSettings: mocks.saveSettings,
}));
vi.mock("@/lib/prayer-engine/server", () => ({
  calibrateAgainstHistoricalSchedule: mocks.calibrate,
  commitFutureRecalculation: mocks.commitRecalculation,
  commitScheduleExtension: mocks.commitExtension,
  previewFutureRecalculation: mocks.previewRecalculation,
  previewScheduleExtension: mocks.previewExtension,
}));
vi.mock("@/lib/security/admin-audit", () => ({
  adminActionError: (error: unknown, fallback = "error") =>
    error instanceof Error ? error.message : fallback,
  beginAdminAudit: mocks.beginAudit,
  completeAdminAudit: mocks.completeAudit,
}));

import {
  commitPrayerRecalculationAction,
  commitPrayerScheduleExtensionAction,
  savePrayerEngineSettingsAction,
} from "./actions";
import { SYNTHETIC_TEST_PRAYER_SETTINGS } from "@/lib/prayer-engine/test-settings";

const extensionPreview: PrayerSchedulePreview = {
  startDate: "2026-11-01",
  endDate: "2027-10-31",
  expectedFirstMissing: "2026-11-01",
  settingsRevision: 7,
  rows: [],
};

const recalculationPreview: PrayerScheduleDiff = {
  startDate: "2026-11-01",
  endDate: "2026-11-01",
  settingsRevision: 7,
  changedRowCount: 0,
  changedPrayerCount: 0,
  rows: [],
};

describe("Prayer Engine operator-controlled schedule commits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.beginAudit.mockResolvedValue({ id: "audit" });
    mocks.completeAudit.mockImplementation(async (_audit, result) => result);
    mocks.commitExtension.mockResolvedValue(3);
    mocks.commitRecalculation.mockResolvedValue(2);
    mocks.saveSettings.mockResolvedValue(SYNTHETIC_TEST_PRAYER_SETTINGS);
  });


  it("saves operator settings without invoking either schedule commit path", async () => {
    await expect(
      savePrayerEngineSettingsAction("token", SYNTHETIC_TEST_PRAYER_SETTINGS),
    ).resolves.toMatchObject({ success: true });

    expect(mocks.saveSettings).toHaveBeenCalledTimes(1);
    expect(mocks.commitExtension).not.toHaveBeenCalled();
    expect(mocks.commitRecalculation).not.toHaveBeenCalled();
  });

  it("allows an audited extension commit to reach the existing server safety layer without a hard-coded profile gate", async () => {
    await expect(
      commitPrayerScheduleExtensionAction("token", extensionPreview),
    ).resolves.toEqual({ success: true, data: 3 });

    expect(mocks.beginAudit).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ action: "prayer_engine.schedule.extend" }),
    );
    expect(mocks.commitExtension).toHaveBeenCalledWith(extensionPreview);
  });

  it("allows an audited recalculation commit to reach the existing server safety layer without a hard-coded profile gate", async () => {
    await expect(
      commitPrayerRecalculationAction("token", recalculationPreview),
    ).resolves.toEqual({ success: true, data: 2 });

    expect(mocks.beginAudit).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ action: "prayer_engine.schedule.recalculate" }),
    );
    expect(mocks.commitRecalculation).toHaveBeenCalledWith(recalculationPreview);
  });

  it("preserves stale-preview/revision failures returned by the server safety layer", async () => {
    mocks.commitExtension.mockRejectedValueOnce(
      new Error("Prayer calculation revision changed; preview again"),
    );

    await expect(
      commitPrayerScheduleExtensionAction("token", extensionPreview),
    ).resolves.toEqual({
      success: false,
      error: "Prayer calculation revision changed; preview again",
    });
  });

  it("does not mutate the schedule when authorization/audit startup fails", async () => {
    mocks.beginAudit.mockRejectedValueOnce(new Error("admin.errors.unauthorized"));

    await expect(
      commitPrayerScheduleExtensionAction("token", extensionPreview),
    ).resolves.toEqual({
      success: false,
      error: "admin.errors.unauthorized",
    });
    expect(mocks.commitExtension).not.toHaveBeenCalled();
  });

  it("keeps the server revision, stale-preview, and future-only guards in place", () => {
    const source = readFileSync("lib/prayer-engine/server.ts", "utf8");
    expect(source).toContain("Prayer calculation revision changed; preview again");
    expect(source).toContain("Prayer schedule changed; preview again");
    expect(source).toContain("Future recalculation cannot change past dates");
  });

  it("removes the compile-time production-profile gate from actions and Admin UI", () => {
    const actions = readFileSync("app/admin/prayer-engine/actions.ts", "utf8");
    const admin = readFileSync("app/admin/prayer-engine/PrayerEngineAdmin.tsx", "utf8");
    const page = readFileSync("app/admin/prayer-engine/page.tsx", "utf8");

    expect(actions).not.toContain("PRODUCTION_PRAYER_PROFILE_APPROVED");
    expect(admin).not.toContain("profileApproved");
    expect(admin).not.toContain("PRODUCTION_PRAYER_PROFILE_APPROVAL_REASON");
    expect(page).not.toContain("PRODUCTION_PRAYER_PROFILE_APPROVED");
    expect(admin).toContain('window.confirm("Apply this future prayer schedule diff?")');
  });
});
