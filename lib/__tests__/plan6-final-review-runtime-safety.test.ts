import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { prayerSettingsInsertValues } from "@/lib/data/prayer-settings";
import { APP_TIME_ZONE } from "@/lib/date-utils";
import {
  commitFutureRecalculation,
  previewFutureRecalculation,
  type PrayerEngineServerDependencies,
} from "@/lib/prayer-engine/server";
import type { PrayerTime } from "@/lib/types";
import { validSettings } from "@/lib/prayer-engine/test-settings";

const source = (path: string) => readFileSync(path, "utf8");

describe("Plan 6 final-review runtime safety regressions", () => {
  const scheduleRow = (date: string): PrayerTime => ({
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
  });

  it("keeps the first saved timezone pending until a schedule recalculation applies it", () => {
    const pending = {
      ...validSettings,
      timezone: "Asia/Tokyo",
      calculationRevision: 1,
      appliedCalculationRevision: 0,
    };

    const values = prayerSettingsInsertValues(pending);

    expect(values.timezone).toBe("Asia/Tokyo");
    expect(values.applied_timezone).toBe(APP_TIME_ZONE);
  });

  it("rejects partial canonical writes while a timezone change is pending", async () => {
    const pendingSettings = {
      ...validSettings,
      timezone: "Asia/Tokyo",
      calculationRevision: validSettings.calculationRevision + 1,
    };
    const appliedSettings = {
      ...validSettings,
      timezone: "Europe/Berlin",
    };
    const rows = [scheduleRow("2026-09-22"), scheduleRow("2026-09-23")];
    const getPrayerTimes = vi.fn(
      async (
        _includeUnpublished?: boolean,
        startDate?: string,
        endDate?: string,
        limit = 400,
      ) =>
        rows
          .filter(
            (row) =>
              (!startDate || row.date >= startDate) &&
              (!endDate || row.date <= endDate),
          )
          .slice(0, limit),
    );
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    const dependencies: PrayerEngineServerDependencies = {
      getSettings: vi.fn().mockResolvedValue(pendingSettings),
      getRuntimeSettings: vi.fn().mockResolvedValue(appliedSettings),
      getPrayerTimes,
      rpc,
      invalidatePrayerCaches: vi.fn(),
      today: vi.fn().mockReturnValue("2026-09-22"),
    };

    const preview = await previewFutureRecalculation(
      "2026-09-22",
      "2026-09-22",
      dependencies,
    );

    await expect(
      commitFutureRecalculation(preview, dependencies),
    ).rejects.toThrow("full future recalculation");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("blocks timezone-change recalculation while applied and pending zones are on different local dates", async () => {
    const pendingSettings = {
      ...validSettings,
      timezone: "America/Los_Angeles",
      calculationRevision: validSettings.calculationRevision + 1,
    };
    const appliedSettings = {
      ...validSettings,
      timezone: "Europe/Berlin",
    };
    const dependencies: PrayerEngineServerDependencies = {
      getSettings: vi.fn().mockResolvedValue(pendingSettings),
      getRuntimeSettings: vi.fn().mockResolvedValue(appliedSettings),
      getPrayerTimes: vi.fn().mockResolvedValue([]),
      rpc: vi.fn().mockResolvedValue({ data: 1, error: null }),
      invalidatePrayerCaches: vi.fn(),
      today: vi.fn((timezone: string) =>
        timezone === "Europe/Berlin" ? "2026-09-22" : "2026-09-21",
      ),
    };

    await expect(
      previewFutureRecalculation(
        "2026-09-22",
        "2026-09-22",
        dependencies,
      ),
    ).rejects.toThrow("share the same local date");
  });

  it("rechecks mosque-local today inside the atomic recalculation RPC after locking settings", () => {
    const sql = source(
      "supabase/migrations/20260922061000_applied_timezone.sql",
    ).toLowerCase();
    const settingsLock = sql.indexOf("for update;");
    const appliedToday = sql.indexOf(
      "v_applied_today := (\n    statement_timestamp() at time zone v_settings.applied_timezone",
      settingsLock,
    );
    const staleTodayGuard = sql.indexOf(
      "if p_today is distinct from v_applied_today",
      appliedToday,
    );
    const futureOnlyGuard = sql.indexOf(
      "if p_start_date < v_applied_today",
      staleTodayGuard,
    );
    const insert = sql.indexOf("insert into public.prayer_times");

    expect(settingsLock).toBeGreaterThan(-1);
    expect(appliedToday).toBeGreaterThan(settingsLock);
    expect(staleTodayGuard).toBeGreaterThan(appliedToday);
    expect(futureOnlyGuard).toBeGreaterThan(staleTodayGuard);
    expect(futureOnlyGuard).toBeLessThan(insert);
    expect(sql).toContain("where date >= v_applied_today");
  });

  it("defends timezone transitions inside the atomic recalculation RPC before canonical writes", () => {
    const sql = source(
      "supabase/migrations/20260922061000_applied_timezone.sql",
    ).toLowerCase();
    const insert = sql.indexOf("insert into public.prayer_times");
    const timezoneGuard = sql.indexOf(
      "if v_settings.timezone <> v_settings.applied_timezone",
    );
    const outsideRangeGuard = sql.indexOf(
      "date >= v_applied_today",
      timezoneGuard,
    );
    const pendingLocalDate = sql.indexOf(
      "at time zone v_settings.timezone",
      timezoneGuard,
    );
    const appliedLocalDate = sql.indexOf(
      "at time zone v_settings.applied_timezone",
      timezoneGuard,
    );

    expect(insert).toBeGreaterThan(-1);
    expect(timezoneGuard).toBeGreaterThan(-1);
    expect(outsideRangeGuard).toBeGreaterThan(timezoneGuard);
    expect(outsideRangeGuard).toBeLessThan(insert);
    expect(pendingLocalDate).toBeGreaterThan(timezoneGuard);
    expect(pendingLocalDate).toBeLessThan(insert);
    expect(appliedLocalDate).toBeGreaterThan(timezoneGuard);
    expect(appliedLocalDate).toBeLessThan(insert);
  });

  it("queues native delivery receipts for current p3 prayer identities", () => {
    const nativeStore = source(
      "android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java",
    );
    expect(nativeStore).toContain('eventId.startsWith("p3:")');
  });

  it("uses the applied timezone, not the pending calculation timezone, for recalculation cutoffs", async () => {
    const pendingSettings = {
      ...validSettings,
      timezone: "America/Los_Angeles",
      calculationRevision: validSettings.calculationRevision + 1,
    };
    const appliedSettings = {
      ...validSettings,
      timezone: "Europe/Berlin",
    };
    const today = vi.fn((timezone: string) =>
      timezone === "Europe/Berlin" ? "2026-09-22" : "2026-09-21",
    );

    const dependencies = {
      getSettings: vi.fn().mockResolvedValue(pendingSettings),
      getRuntimeSettings: vi.fn().mockResolvedValue(appliedSettings),
      getPrayerTimes: vi.fn().mockResolvedValue([]),
      rpc: vi.fn().mockResolvedValue({ data: 1, error: null }),
      invalidatePrayerCaches: vi.fn(),
      today,
    } as PrayerEngineServerDependencies & {
      getRuntimeSettings: () => Promise<typeof appliedSettings>;
    };

    await expect(
      previewFutureRecalculation("2026-09-21", "2026-09-21", dependencies),
    ).rejects.toThrow("mosque-local today");
    expect(today).toHaveBeenCalledWith("Europe/Berlin");
  });

  it("rechecks dynamic Feed capacity after atomically promoting applied_timezone", () => {
    const sql = source(
      "supabase/migrations/20260922061000_applied_timezone.sql",
    ).toLowerCase();
    const promotion = sql.indexOf("applied_timezone = timezone");
    const budgetCheck = sql.indexOf(
      "perform public.assert_masjid_display_dynamic_content_budget()",
      promotion,
    );

    expect(promotion).toBeGreaterThan(-1);
    expect(budgetCheck).toBeGreaterThan(promotion);
  });

  it("preflights the redefined serialized-byte capacity function during migration", () => {
    const sql = source(
      "supabase/migrations/20260922062000_masjid_display_dynamic_budget_timezone.sql",
    ).toLowerCase();
    const definition = sql.indexOf(
      "create or replace function public.assert_masjid_display_dynamic_content_budget()",
    );
    const functionEnd = sql.indexOf(
      "revoke all on function public.assert_masjid_display_dynamic_content_budget()",
      definition,
    );
    const preflight = sql.indexOf(
      "select public.assert_masjid_display_dynamic_content_budget();",
      functionEnd,
    );

    expect(definition).toBeGreaterThan(-1);
    expect(functionEnd).toBeGreaterThan(definition);
    expect(preflight).toBeGreaterThan(functionEnd);
  });
});
