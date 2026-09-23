import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("Plan 6 final review snapshot and announcement regressions", () => {
  it("keeps the legacy Berlin schedule readable before prayer_settings exists", () => {
    const settings = source("lib/data/prayer-settings.ts");
    expect(settings).toContain("getRuntimePrayerTimezone");
    expect(settings).toContain("APP_TIME_ZONE");

    for (const path of [
      "app/page.tsx",
      "app/times/page.tsx",
      "app/friday/page.tsx",
      "app/home-prayer-runtime.ts",
    ]) {
      expect(source(path)).toContain("getPublishedPrayerScheduleSnapshot");
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

  it("keeps the snapshot refactor free of CodeQL-reported dead conditions and variables", () => {
    const settings = source("lib/data/prayer-settings.ts");
    const cron = source("app/api/cron/prayer-reminders/route.ts");
    expect(settings).not.toContain('typeof error === "object" && error');
    expect(cron).not.toContain("const today = prayerSnapshot.from");
    expect(cron).not.toContain("const tomorrow = prayerSnapshot.through");
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
  it("rejects stale announcement wall-clock forms after the applied timezone changes", () => {
    const actions = source("app/admin/announcements/actions.ts");
    const client = source("components/admin/AdminAnnouncementsPageClient.tsx");

    expect(client.match(/formTimezone: timezone/g) ?? []).toHaveLength(3);
    expect(actions).toContain("data.formTimezone !== timezone");
  });

  it("keeps public prayer readers on atomic timezone-row snapshots", () => {
    for (const path of [
      "app/page.tsx",
      "app/home-prayer-runtime.ts",
      "app/friday/page.tsx",
    ]) {
      expect(source(path)).toContain("getPublishedPrayerScheduleSnapshot");
    }

    const homeRuntime = source("app/home-prayer-runtime.ts");
    expect(homeRuntime).not.toContain("schedule: [], iqamaDelays: null, timezone: null");

    const timesPage = source("app/times/page.tsx");
    expect(timesPage).toContain("getPublishedPrayerScheduleSnapshot");

    const browser = source("components/prayer/PrayerTimesBrowser.tsx");
    expect(browser).toContain("loadPrayerScheduleRuntime");
    expect(browser).not.toContain("getPrayerTimes(false");
  });

});
