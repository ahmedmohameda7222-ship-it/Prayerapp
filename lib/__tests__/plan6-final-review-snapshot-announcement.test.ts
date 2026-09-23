import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("Plan 6 final review snapshot and announcement regressions", () => {
  it("keeps the legacy Berlin schedule readable before prayer_settings exists", () => {
    const settings = source("lib/data/prayer-settings.ts");
    expect(settings).toContain("getRuntimePrayerTimezone");
    expect(settings).toContain("APP_TIME_ZONE");

    for (const path of ["app/page.tsx", "app/times/page.tsx", "app/friday/page.tsx"]) {
      const page = source(path);
      expect(page).toContain("getRuntimePrayerTimezone");
    }
  });

  it("reads applied timezone and published prayer rows from one database snapshot", () => {
    const adapter = source("lib/data/prayer-schedule-snapshot.ts");
    expect(adapter).toContain('rpc("get_published_prayer_schedule_snapshot"');

    const migration = source(
      "supabase/migrations/20260923030000_published_prayer_schedule_snapshot.sql",
    ).toLowerCase();
    expect(migration).toContain(
      "create or replace function public.get_published_prayer_schedule_snapshot",
    );
    expect(migration).toContain("applied_timezone");
    expect(migration).toContain("europe/berlin");
    expect(migration).toContain("from public.prayer_times");

    for (const path of [
      "app/api/android/prayer-schedule/route.ts",
      "lib/masjid-display/build-feed.ts",
      "app/api/cron/prayer-reminders/route.ts",
    ]) {
      expect(source(path)).toContain("getPublishedPrayerScheduleSnapshot");
    }
  });

  it("parses and formats announcement datetime-local values in the applied runtime timezone", () => {
    const actions = source("app/admin/announcements/actions.ts");
    expect(actions).toContain("getRuntimePrayerTimezone");
    expect(actions).toContain("parseDateTimeLocalInput");
    expect(actions).not.toContain("zonedDateTime(date, time)");

    const page = source("app/admin/announcements/page.tsx");
    expect(page).toContain("getRuntimePrayerTimezone");

    const client = source("components/admin/AdminAnnouncementsPageClient.tsx");
    expect(client).toContain("formatDateTimeLocalInput(item.displayFrom, timezone)");
    expect(client).toContain("formatDateTimeLocalInput(item.displayUntil, timezone)");
  });
});
