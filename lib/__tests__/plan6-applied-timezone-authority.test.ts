import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("Plan 6 applied timezone authority", () => {
  it("adds an applied-timezone migration and promotes it atomically with full schedule recalculation", () => {
    const migrationName = readdirSync("supabase/migrations")
      .sort()
      .find((name) => name.includes("applied_timezone"));
    expect(migrationName).toBeTruthy();
    if (!migrationName) return;

    const sql = source(`supabase/migrations/${migrationName}`).toLowerCase();
    expect(sql).toContain("applied_timezone");
    expect(sql).toContain("applied_timezone = timezone");
    expect(sql).toContain("timezone change requires full future recalculation");
    expect(sql.indexOf("applied_timezone = timezone"))
      .toBeGreaterThan(sql.indexOf("insert into public.prayer_times"));
  });

  it("exposes pending settings separately from applied runtime settings", () => {
    const persistence = source("lib/data/prayer-settings.ts");
    expect(persistence).toContain("getPrayerSettings");
    expect(persistence).toContain("getRuntimePrayerSettings");
    expect(persistence).toContain("applied_timezone");
  });

  it("uses applied runtime authority in public scheduling consumers", () => {
    for (const path of [
      "app/page.tsx",
      "app/times/page.tsx",
      "app/friday/page.tsx",
      "app/home-prayer-runtime.ts",
      "lib/masjid-display/build-feed.ts",
      "app/api/cron/prayer-reminders/route.ts",
      "app/api/android/prayer-schedule/route.ts",
    ]) {
      expect(source(path)).toContain("getPublishedPrayerScheduleSnapshot");
    }

    expect(source("app/home-prayer-runtime.ts")).toContain("getPrayerRuntimeAuthority");
    expect(source("components/prayer/PrayerTimesBrowser.tsx")).toContain("loadPrayerScheduleRuntime");
  });
});
