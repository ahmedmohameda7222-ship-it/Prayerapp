import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { nextCalculationRevision } from "@/lib/data/prayer-settings";
import type { PrayerTime } from "@/lib/types";
import { validSettings } from "./test-settings";
import {
  commitFutureRecalculation,
  commitScheduleExtension,
  previewFutureRecalculation,
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
  it("uses a service-role reader for internal schedule basis reads", () => {
    const source = readFileSync("lib/prayer-engine/server.ts", "utf8");
    expect(source).not.toContain(
      'import { getPrayerTimes } from "@/lib/data/prayer-times";',
    );
    expect(source).toContain("async function getPrayerTimesForEngine");
    expect(source).toContain('.from("prayer_times")');
    expect(source).toContain("getPrayerTimes: getPrayerTimesForEngine");
  });

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

  it("rejects a future recalculation when the approved prior-row basis changes", async () => {
    const date = "2026-09-16";
    let currentRows = [scheduleRow(date)];
    const getPrayerTimes = vi.fn(async () => currentRows);
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    const dependencies = deps({ getPrayerTimes, rpc });

    const preview = await previewFutureRecalculation(date, date, dependencies);
    currentRows = [{ ...scheduleRow(date), fajr: "05:01" }];

    await expect(commitFutureRecalculation(preview, dependencies)).rejects.toThrow(
      "Prayer schedule changed; preview again",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes the approved prior-row basis into the atomic recalculation RPC", async () => {
    const date = "2026-09-16";
    const existing = [scheduleRow(date)];
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    const dependencies = deps({ getPrayerTimes: vi.fn().mockResolvedValue(existing), rpc });
    const preview = await previewFutureRecalculation(date, date, dependencies);

    await commitFutureRecalculation(preview, dependencies);

    expect(rpc).toHaveBeenCalledWith(
      "commit_prayer_schedule_recalculation",
      expect.objectContaining({
        p_expected_rows: [
          expect.objectContaining({
            date,
            exists: true,
            fajr: "05:00",
          }),
        ],
      }),
    );
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