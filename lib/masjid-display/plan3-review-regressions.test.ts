import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const BOUNDED_GENERATED_AT_MIGRATION =
  "supabase/migrations/20260917233500_masjid_display_bounded_generated_at.sql";

describe("Plan 3 Codex review regressions", () => {
  it("uses database-bounded readers for every windowed optional feed source", () => {
    const buildFeed = read("lib/masjid-display/build-feed.ts");
    const jumuah = read("lib/data/jumuah.ts");
    const announcements = read("lib/data/announcements.ts");
    const events = read("lib/data/events.ts");
    const campaigns = read("lib/data/donations.ts");

    expect(buildFeed).toContain("getJumuahTimesForDisplayWindow");
    expect(buildFeed).toContain("getAnnouncementsForDisplayWindow");
    expect(buildFeed).toContain("getEventsForDisplayWindow");
    expect(buildFeed).toContain("getDonationCampaignsForDisplayWindow");

    expect(jumuah).toContain("export async function getJumuahTimesForDisplayWindow");
    expect(jumuah).toContain('.gte("date", startDate)');
    expect(jumuah).toContain('.lte("date", endDate)');

    expect(announcements).toContain("export async function getAnnouncementsForDisplayWindow");
    expect(announcements).toContain('.eq("published", true)');
    expect(announcements).toContain("display_until.is.null,display_until.gte.");
    expect(announcements).toContain("display_from.is.null,display_from.lte.");

    expect(events).toContain("export async function getEventsForDisplayWindow");
    expect(events).toContain('.gte("date", startDate)');
    expect(events).toContain('.lte("date", endDate)');

    expect(campaigns).toContain("export async function getDonationCampaignsForDisplayWindow");
    expect(campaigns).toContain('.lte("start_date", endDate)');
    expect(campaigns).toContain("end_date.is.null,end_date.gte.");
  });

  it("derives generatedAt only from represented source rows and singleton authorities", () => {
    const buildFeed = read("lib/masjid-display/build-feed.ts");
    const generatedAt = read("lib/data/masjid-display-generated-at.ts");

    expect(buildFeed).toContain("getMasjidDisplayGeneratedAt");
    expect(buildFeed).toContain("prayerIds: representedPrayers.map");
    expect(buildFeed).toContain("jumuahIds: additionalJumuah.map");
    expect(buildFeed).toContain("announcementIds: projectedAnnouncements.map");
    expect(buildFeed).toContain("eventIds: projectedEvents.map");
    expect(buildFeed).toContain("campaignIds: projectedCampaigns.map");
    expect(generatedAt).toContain('.in("id", representedIds)');
    expect(generatedAt).toContain('load("prayer_settings", ["1"])');
    expect(generatedAt).toContain('load("mosque_settings", ["1"])');
    expect(generatedAt).toContain('load("masjid_display_settings", ["1"])');

    expect(existsSync(BOUNDED_GENERATED_AT_MIGRATION)).toBe(true);
    if (!existsSync(BOUNDED_GENERATED_AT_MIGRATION)) return;

    const sql = read(BOUNDED_GENERATED_AT_MIGRATION).toLowerCase();
    expect(sql).toContain("alter table public.announcements");
    expect(sql).toContain("add column if not exists updated_at timestamptz");
    expect(sql).toContain("create or replace function public.touch_masjid_display_source_updated_at()");
    expect(sql).toContain("to_jsonb(new) - 'updated_at'");
    expect(sql).toContain("greatest(clock_timestamp(), old.updated_at + interval '1 microsecond')");

    for (const table of [
      "prayer_times",
      "prayer_settings",
      "jumuah_times",
      "announcements",
      "events",
      "donation_campaigns",
      "mosque_settings",
      "masjid_display_settings",
    ]) {
      expect(sql).toContain(`before update on public.${table}`);
      expect(sql).toContain(`drop trigger if exists masjid_display_feed_revision_${table} on public.${table}`);
    }

    expect(sql).toContain("drop table if exists public.masjid_display_feed_revision");
  });
});
