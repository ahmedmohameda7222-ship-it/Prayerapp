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
      timezone: "Europe/Paris",
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

  it("uses a moving mosque-local clock around atomic recalculation writes", () => {
    const sql = source(
      "supabase/migrations/20260923100000_prayer_schedule_midnight_write_guards.sql",
    ).toLowerCase();
    const functionStart = sql.indexOf(
      "create or replace function public.commit_prayer_schedule_recalculation",
    );
    const settingsLock = sql.indexOf("for update;", functionStart);
    const firstClock = sql.indexOf(
      "clock_timestamp() at time zone v_settings.applied_timezone",
      settingsLock,
    );
    const firstStaleGuard = sql.indexOf(
      "if p_today is distinct from v_applied_today",
      firstClock,
    );
    const insert = sql.indexOf("insert into public.prayer_times", firstStaleGuard);
    const prewriteClock = sql.lastIndexOf(
      "clock_timestamp() at time zone v_settings.applied_timezone",
      insert,
    );
    const postwriteClock = sql.indexOf(
      "clock_timestamp() at time zone v_settings.applied_timezone",
      insert,
    );

    expect(settingsLock).toBeGreaterThan(functionStart);
    expect(firstClock).toBeGreaterThan(settingsLock);
    expect(firstStaleGuard).toBeGreaterThan(firstClock);
    expect(prewriteClock).toBeGreaterThan(firstStaleGuard);
    expect(prewriteClock).toBeLessThan(insert);
    expect(postwriteClock).toBeGreaterThan(insert);
    expect(sql.slice(functionStart)).not.toContain("statement_timestamp()");
  });

  it("rechecks the moving applied local day around atomic schedule extension writes", () => {
    const sql = source(
      "supabase/migrations/20260923100000_prayer_schedule_midnight_write_guards.sql",
    ).toLowerCase();
    const functionStart = sql.indexOf(
      "create or replace function public.commit_prayer_schedule_extension",
    );
    const functionEnd = sql.indexOf(
      "create or replace function public.commit_prayer_schedule_recalculation",
      functionStart,
    );
    const extension = sql.slice(functionStart, functionEnd);
    const settingsLock = extension.indexOf("for update;");
    const insert = extension.indexOf("insert into public.prayer_times");
    const firstClock = extension.indexOf(
      "clock_timestamp() at time zone v_settings.applied_timezone",
      settingsLock,
    );
    const prewriteClock = extension.lastIndexOf(
      "clock_timestamp() at time zone v_settings.applied_timezone",
      insert,
    );
    const postwriteClock = extension.indexOf(
      "clock_timestamp() at time zone v_settings.applied_timezone",
      insert,
    );

    expect(settingsLock).toBeGreaterThan(-1);
    expect(firstClock).toBeGreaterThan(settingsLock);
    expect(extension).toContain("p_today is distinct from v_applied_today");
    expect(extension).toContain(
      "p_expected_first_missing < v_applied_today",
    );
    expect(extension).toContain(
      "generate_series(v_applied_today, v_applied_today + interval '10 years'",
    );
    expect(prewriteClock).toBeGreaterThan(firstClock);
    expect(prewriteClock).toBeLessThan(insert);
    expect(postwriteClock).toBeGreaterThan(insert);
  });

  it("defends timezone transitions inside the atomic recalculation RPC before canonical writes", () => {
    const sql = source(
      "supabase/migrations/20260923100000_prayer_schedule_midnight_write_guards.sql",
    ).toLowerCase();
    const insert = sql.indexOf("insert into public.prayer_times", sql.indexOf("create or replace function public.commit_prayer_schedule_recalculation"));
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

  it("fails closed on timezone promotion after reminder delivery can start or while native alarms remain active", () => {
    const sql = source(
      "supabase/migrations/20260925073810_plan6_final_review_safety.sql",
    ).toLowerCase();
    const functionStart = sql.indexOf(
      "create or replace function public.commit_prayer_schedule_recalculation",
    );
    const insert = sql.indexOf("insert into public.prayer_times", functionStart);
    const timezoneGuard = sql.indexOf(
      "if v_settings.timezone <> v_settings.applied_timezone",
      functionStart,
    );
    const nativeGuard = sql.indexOf(
      "from public.native_prayer_installations",
      timezoneGuard,
    );
    const revokedGuard = sql.indexOf("where revoked_at is null", nativeGuard);
    const deadline = sql.indexOf("v_timezone_cutover_deadline", timezoneGuard);
    const maxLead = sql.indexOf("interval '15 minutes'", timezoneGuard);
    const unstartedDay = sql.indexOf("defer to an unstarted schedule date", timezoneGuard);

    expect(timezoneGuard).toBeGreaterThan(functionStart);
    expect(nativeGuard).toBeGreaterThan(timezoneGuard);
    expect(revokedGuard).toBeGreaterThan(nativeGuard);
    expect(deadline).toBeGreaterThan(timezoneGuard);
    expect(maxLead).toBeGreaterThan(timezoneGuard);
    expect(unstartedDay).toBeGreaterThan(maxLead);
    expect(nativeGuard).toBeLessThan(insert);
    expect(unstartedDay).toBeLessThan(insert);
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
