import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const BOUNDED_GENERATED_AT_MIGRATION =
  "supabase/migrations/20260917233500_masjid_display_bounded_generated_at.sql";
const SEMANTIC_SOURCE_TIMESTAMP_MIGRATION =
  "supabase/migrations/20260918001500_masjid_display_semantic_source_timestamps.sql";

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
    expect(buildFeed).toContain("azkarRevisionTimestamps:");
    expect(generatedAt).toContain('.in("id", representedIds)');
    expect(generatedAt).toContain('loadSourceTimestamps(client, "prayer_settings", ["1"])');
    expect(generatedAt).toContain('loadSourceTimestamps(client, "mosque_settings", ["1"])');
    expect(generatedAt).toContain('loadSourceTimestamps(client, "masjid_display_settings", ["1"])');
    expect(generatedAt).not.toContain("SHA256_DECIMAL_WIDTH");
    expect(generatedAt).not.toContain("withAzkarContentRevision");

    expect(existsSync(BOUNDED_GENERATED_AT_MIGRATION)).toBe(true);
  });

  it("touches generatedAt timestamps only for Feed-v1 semantic source fields", () => {
    expect(existsSync(SEMANTIC_SOURCE_TIMESTAMP_MIGRATION)).toBe(true);
    if (!existsSync(SEMANTIC_SOURCE_TIMESTAMP_MIGRATION)) return;

    const sql = read(SEMANTIC_SOURCE_TIMESTAMP_MIGRATION).toLowerCase();
    expect(sql).toContain("semantic_keys text[]");
    expect(sql).toContain("case tg_table_name");
    expect(sql).toContain("jsonb_object_agg");
    expect(sql).toContain("when 'events'");
    expect(sql).toContain("'title_ar'");
    expect(sql).toContain("'title_de'");
    expect(sql).not.toContain("'title_en'");
    expect(sql).not.toContain("'title_tr'");
    expect(sql).toContain("when 'mosque_settings'");
    expect(sql).toContain("'public_app_url'");
    expect(sql).toContain("when 'prayer_settings'");
    expect(sql).toContain("'fajr_iqama_delay_minutes'");
  });
});
