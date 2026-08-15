import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isUpcomingEvent } from "@/lib/event-utils";
import { getMissingPublishedPrayerDates } from "@/lib/prayer-coverage";
import type { Event, PrayerTime } from "@/lib/types";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const prayer = (date: string, published = true): PrayerTime => ({
  id: date,
  date,
  fajr: "04:00",
  sunrise: "06:00",
  dhuhr: "13:00",
  asr: "17:00",
  maghrib: "20:30",
  isha: "22:00",
  published,
  updatedAt: "2026-08-16T00:00:00+02:00",
});

const event = (overrides: Partial<Event> = {}): Event => ({
  id: "event-1",
  title: "Event",
  description: "Description",
  date: "2026-08-16",
  startTime: "18:00",
  endTime: "19:00",
  location: "Mosque",
  type: "Community",
  published: true,
  ...overrides,
});

describe("logic hardening", () => {
  it("checks every day in the upcoming seven-day prayer window", () => {
    const rows = [
      prayer("2026-08-17"),
      prayer("2026-08-18"),
      prayer("2026-08-19"),
      prayer("2026-08-20"),
      prayer("2026-08-21"),
      prayer("2026-08-22"),
      prayer("2026-08-23"),
    ];
    expect(getMissingPublishedPrayerDates(rows, "2026-08-17", 7)).toEqual([]);
    expect(getMissingPublishedPrayerDates(rows.slice(0, 6), "2026-08-17", 7)).toEqual(["2026-08-23"]);
  });

  it("does not count an event that already ended today as upcoming", () => {
    expect(isUpcomingEvent(event(), new Date("2026-08-16T20:00:00+02:00"))).toBe(false);
    expect(isUpcomingEvent(event(), new Date("2026-08-16T18:30:00+02:00"))).toBe(true);
    expect(isUpcomingEvent(event({ endTime: "" }), new Date("2026-08-16T18:30:00+02:00"))).toBe(false);
  });

  it("fetches Prayer Times by the active range instead of a fixed 90-day window", () => {
    const browser = source("components/prayer/PrayerTimesBrowser.tsx");
    expect(browser).toContain('const rangeKey = `${range.start}:${range.end}`');
    expect(browser).toContain("getPrayerTimes(false, range.start, range.end)");
    expect(browser).not.toContain("addDaysIso(today, 90)");
  });

  it("keeps QA prayer rows out of reminder delivery", () => {
    const cron = source("app/api/cron/prayer-reminders/route.ts");
    expect(cron).toContain('const QA_MOCK_MARKER = "SUPABASE_QA_MOCK"');
    expect(cron).toContain("schedule.note !== QA_MOCK_MARKER");
  });

  it("deduplicates Friday notifications at the Friday-date level", () => {
    const friday = source("app/admin/jumuah/actions.ts");
    expect(friday).toContain("eventKey: `jumuah:${row.date}:published`");
    expect(friday).not.toContain("eventKey: `jumuah:${row.id}:published`");
  });

  it("allows failed pushes to retry and expires prayer reminders quickly", () => {
    const push = source("lib/push/web-push.ts");
    expect(push).toContain('row.status === "failed"');
    expect(push).toContain("TTL: isPrayerReminder ? 10 * 60");
    expect(push).toContain('row?.status === "sent"');
  });

  it("uses Europe/Berlin for Azkar daily state while keeping Azkar hard-coded", () => {
    const routine = source("components/azkar/AzkarRoutine.tsx");
    const page = source("app/azkar/page.tsx");
    expect(routine).toContain("APP_TIME_ZONE");
    expect(routine).toContain("todayIso(date)");
    expect(page).toContain("getHardcodedAzkarCategories");
    expect(page).toContain("getHardcodedAzkarItems");
  });

  it("removes Admin-managed Azkar from the product", () => {
    const sidebar = source("components/layout/AdminSidebar.tsx");
    expect(sidebar).not.toContain("/admin/azkar");
  });

  it("makes mutable PWA assets network-first after a new deploy", () => {
    const sw = source("public/sw.js");
    expect(sw).toContain('const VERSION = "v16"');
    expect(sw).toContain("networkFirstAsset(request, target)");
    expect(sw).toContain('url.pathname.startsWith("/_next/static/")');
  });

  it("aligns nullable fields, time checks, and data-api grants in the database migration", () => {
    const migration = source("supabase/migrations/20260816010000_logic_hardening.sql");
    expect(migration).toContain("events alter column end_time drop not null");
    expect(migration).toContain("ramadan_days alter column taraweeh drop not null");
    expect(migration).toContain("jumuah_times alter column khutbah_time drop not null");
    expect(migration).toContain("2[0-3]");
    expect(migration).toContain("revoke all on table");
    expect(migration).toContain("verify_prayer_reminder_cron_token");
  });

  it("preserves announcement creation time when editing", () => {
    const announcements = source("lib/data/announcements.ts");
    expect(announcements).toContain("if (includeCreatedAt) db.created_at");
    expect(announcements).toContain("insert(mapToDb(item, true)");
    expect(announcements).toContain("update(mapToDb(item)");
  });
});
