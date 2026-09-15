import { describe, expect, it, vi } from "vitest";
import { nextCalculationRevision } from "@/lib/data/prayer-settings";
import { validSettings } from "./test-settings";
import {
  commitScheduleExtension,
  previewScheduleExtension,
  type PrayerEngineServerDependencies,
} from "./server";

function deps(
  overrides: Partial<PrayerEngineServerDependencies> = {},
): PrayerEngineServerDependencies {
  return {
    getSettings: vi.fn().mockResolvedValue(validSettings),
    getPrayerTimes: vi.fn().mockResolvedValue([]),
    rpc: vi.fn().mockResolvedValue({ data: 1, error: null }),
    invalidatePrayerCaches: vi.fn(),
    today: () => "2026-09-15",
    ...overrides,
  };
}

describe("prayer engine server orchestration", () => {
  it("preview performs no RPC write", async () => {
    const rpc = vi.fn();
    await previewScheduleExtension("2026-09-15", deps({ rpc }));
    expect(rpc).not.toHaveBeenCalled();
  });

  it("delay-only edits do not bump calculation revision", () => {
    const next = {
      ...validSettings,
      iqamaDelays: { ...validSettings.iqamaDelays, fajr: 5 },
    };
    expect(nextCalculationRevision(validSettings, next)).toBe(
      validSettings.calculationRevision,
    );
  });

  it("calculation-offset edits do bump calculation revision", () => {
    const next = {
      ...validSettings,
      offsets: { ...validSettings.offsets, fajr: 1 },
    };
    expect(nextCalculationRevision(validSettings, next)).toBe(
      validSettings.calculationRevision + 1,
    );
  });

  it("invalidates prayer caches only after a successful commit", async () => {
    const successDeps = deps();
    const preview = await previewScheduleExtension(
      "2026-09-15",
      successDeps,
    );
    await commitScheduleExtension(preview, successDeps);
    expect(successDeps.invalidatePrayerCaches).toHaveBeenCalledTimes(1);

    const failureDeps = deps({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "boom" },
      }),
    });
    const failurePreview = await previewScheduleExtension(
      "2026-09-15",
      failureDeps,
    );
    await expect(
      commitScheduleExtension(failurePreview, failureDeps),
    ).rejects.toThrow();
    expect(failureDeps.invalidatePrayerCaches).not.toHaveBeenCalled();
  });
});
