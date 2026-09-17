import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const REVISION_MIGRATION =
  "supabase/migrations/20260917041000_masjid_display_feed_revision.sql";

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

  it("derives generatedAt from a monotonic database source revision covering feed authorities", () => {
    const buildFeed = read("lib/masjid-display/build-feed.ts");

    expect(buildFeed).toContain("getMasjidDisplayFeedRevision");
    expect(buildFeed).not.toContain("latestSourceTimestamp(");
    expect(existsSync(REVISION_MIGRATION)).toBe(true);

    if (!existsSync(REVISION_MIGRATION)) return;
    const sql = read(REVISION_MIGRATION).toLowerCase();
    expect(sql).toContain("create table public.masjid_display_feed_revision");
    expect(sql).toContain("greatest(clock_timestamp(), updated_at + interval '1 microsecond')");
    expect(sql).toContain("for each statement execute function public.touch_masjid_display_feed_revision()");

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
      expect(sql).toContain(`on public.${table}`);
    }
  });
});
