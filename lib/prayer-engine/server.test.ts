import { describe, expect, it, vi } from "vitest";
import { nextCalculationRevision } from "@/lib/data/prayer-settings";
import type { PrayerTime } from "@/lib/types";
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

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function scheduleRow(date: string): PrayerTime {
  return {
    id: date,
    date,
    fajr: "05:00",
    sunrise: "06:30",
    dhuhr: "13:00",
    asr: "16:00",
    maghrib: "19:00",
    isha: "20:30",
    published: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("prayer engine server orchestration", () => {
  it("preview performs no RPC write", async () => {
    const rpc = vi.fn();
    await previewScheduleExtension("2026-09-15", deps({ rpc }));
    expect(rpc).not.toHaveBeenCalled();
  });

  it("finds the real first gap even when more than 400 future rows already exist", async () => {
    const today = "2026-01-01";
    const existing = Array.from({ length: 500 }, (_, index) =>
      scheduleRow(addDays(today, index)),
    );
    const getPrayerTimes = vi.fn(
      async (
        _includeUnpublished?: boolean,
        startDate?: string,
        endDate?: string,
        limit = 400,
      ) =>
        existing
          .filter(
            (row) =>
              (!startDate || row.date >= startDate) &&
              (!endDate || row.date <= endDate),
          )
          .slice(0, limit),
    );

    const preview = await previewScheduleExtension(
      today,
      deps({ getPrayerTimes, today: () => today }),
    );

    expect(preview.expectedFirstMissing).toBe(addDays(today, 500));
    expect(getPrayerTimes.mock.calls.length).toBeGreaterThan(1);
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
