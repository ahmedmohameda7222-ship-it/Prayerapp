import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const BOUNDED_GENERATED_AT_MIGRATION =
  "supabase/migrations/20260917233500_masjid_display_bounded_generated_at.sql";
const SEMANTIC_SOURCE_TIMESTAMP_MIGRATION =
  "supabase/migrations/20260918001500_masjid_display_semantic_source_timestamps.sql";
const SNAPSHOT_WINDOW_READERS_MIGRATION =
  "supabase/migrations/20260918015000_masjid_display_snapshot_window_readers.sql";

describe("Plan 3 Codex review regressions", () => {
  it("uses database-bounded snapshot readers for every windowed optional feed source", () => {
    const buildFeed = read("lib/masjid-display/build-feed.ts");
    const jumuah = read("lib/data/jumuah.ts");
    const announcements = read("lib/data/announcements.ts");
    const events = read("lib/data/events.ts");
    const campaigns = read("lib/data/donations.ts");

    expect(existsSync(SNAPSHOT_WINDOW_READERS_MIGRATION)).toBe(true);
    if (!existsSync(SNAPSHOT_WINDOW_READERS_MIGRATION)) return;
    const snapshotSql = read(SNAPSHOT_WINDOW_READERS_MIGRATION).toLowerCase();

    expect(buildFeed).toContain("getJumuahTimesForDisplayWindow");
    expect(buildFeed).toContain("getAnnouncementsForDisplayWindow");
    expect(buildFeed).toContain("getEventsForDisplayWindow");
    expect(buildFeed).toContain("getDonationCampaignsForDisplayWindow");

    expect(jumuah).toContain("export async function getJumuahTimesForDisplayWindow");
    expect(jumuah).toContain('.rpc("get_masjid_display_jumuah_window"');
    expect(snapshotSql).toContain("from public.jumuah_times as j");
    expect(snapshotSql).toContain("j.published is true");
    expect(snapshotSql).toContain("j.date >= p_start_date");
    expect(snapshotSql).toContain("j.date <= p_end_date");

    expect(announcements).toContain("export async function getAnnouncementsForDisplayWindow");
    expect(announcements).toContain('.rpc("get_masjid_display_announcements_window"');
    expect(snapshotSql).toContain("from public.announcements as a");
    expect(snapshotSql).toContain("a.published is true");
    expect(snapshotSql).toContain("a.display_until is null or a.display_until >= p_now");
    expect(snapshotSql).toContain("a.display_from is null or a.display_from <= p_horizon_end");

    expect(events).toContain("export async function getEventsForDisplayWindow");
    expect(events).toContain('.rpc("get_masjid_display_events_window"');
    expect(snapshotSql).toContain("from public.events as e");
    expect(snapshotSql).toContain("e.published is true");
    expect(snapshotSql).toContain("e.date >= p_start_date");
    expect(snapshotSql).toContain("e.date <= p_end_date");

    expect(campaigns).toContain("export async function getDonationCampaignsForDisplayWindow");
    expect(campaigns).toContain('.rpc("get_masjid_display_campaigns_window"');
    expect(snapshotSql).toContain("from public.donation_campaigns as c");
    expect(snapshotSql).toContain("c.is_active is true");
    expect(snapshotSql).toContain("c.start_date <= p_end_date");
    expect(snapshotSql).toContain("c.end_date is null or c.end_date >= p_start_date");
  });

  it("derives generatedAt only from timestamps captured with represented source reads", () => {
    const buildFeed = read("lib/masjid-display/build-feed.ts");
    const generatedAt = read("lib/data/masjid-display-generated-at.ts");

    expect(buildFeed).toContain("getMasjidDisplayGeneratedAt");
    expect(buildFeed).toContain("getPrayerSettingsForDisplay");
    expect(buildFeed).toContain("getMosqueSettingsForDisplay");
    expect(buildFeed).toContain("getMasjidDisplaySettingsForDisplay");
    expect(buildFeed).toContain("sourceTimestamps");
    expect(buildFeed).toContain("getAzkarSourceRevisionTimestamps");
    expect(buildFeed).toContain("azkarRevisionTimestamps,");
    expect(generatedAt).toContain("sourceTimestamps");
    expect(generatedAt).not.toContain("createServerClient");
    expect(generatedAt).not.toContain("loadSourceTimestamps");
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
