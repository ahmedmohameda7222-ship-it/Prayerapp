import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("Plan 6 applied timezone authority", () => {
  it("stores a separate applied timezone and promotes it atomically with schedule recalculation", () => {
    const migrations = source("supabase/migrations/20260915220000_masjid_display_prayer_settings.sql");
    const atomic = source("supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql");

    expect(migrations).toContain("applied_timezone");
    expect(atomic).toContain("applied_timezone = timezone");
    expect(atomic.indexOf("applied_timezone = timezone"))
      .toBeGreaterThan(atomic.indexOf("insert into public.prayer_times"));
  });

  it("exposes pending settings separately from applied runtime settings", () => {
    const persistence = source("lib/data/prayer-settings.ts");
    expect(persistence).toContain("getPrayerSettings");
    expect(persistence).toContain("getRuntimePrayerSettings");
    expect(persistence).toContain("applied_timezone");
  });

  it("uses the applied runtime timezone in public scheduling consumers", () => {
    for (const path of [
      "lib/masjid-display/build-feed.ts",
      "app/page.tsx",
      "app/times/page.tsx",
      "app/friday/page.tsx",
      "app/api/cron/prayer-reminders/route.ts",
      "app/api/android/prayer-schedule/route.ts",
    ]) {
      expect(source(path)).toContain("getRuntimePrayerSettings");
    }
  });
});
