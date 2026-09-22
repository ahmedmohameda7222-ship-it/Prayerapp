import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  previewFutureRecalculation,
  type PrayerEngineServerDependencies,
} from "@/lib/prayer-engine/server";
import { validSettings } from "@/lib/prayer-engine/test-settings";

const source = (path: string) => readFileSync(path, "utf8");

describe("Plan 6 final-review runtime safety regressions", () => {
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
