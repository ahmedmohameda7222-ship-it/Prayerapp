import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plan 5 final Codex regression guards", () => {
  it("bounds public snapshot-reader work before serializing source rows", () => {
    const sql = readFileSync(
      "supabase/migrations/20260919023000_masjid_display_feed_bounds.sql",
      "utf8",
    );

    expect(sql).toContain("p_end_date - p_start_date > 36");
    expect(sql).toContain("p_horizon_end > p_now + interval '37 days'");
    expect(sql).not.toMatch(/if exists \([\s\S]*?pg_column_size\(to_jsonb\(/i);
    expect((sql.match(/with bounded as \(/gi) ?? []).length).toBe(4);
    expect((sql.match(/max\(pg_column_size\(row_json\)\)/gi) ?? []).length).toBe(4);

    const boundedBlocks = Array.from(
      sql.matchAll(/with bounded as \(([\s\S]*?)\n\s*\)/gi),
      (match) => match[1],
    );
    expect(boundedBlocks).toHaveLength(4);
    for (const block of boundedBlocks) {
      expect(block).not.toMatch(/\border by\b/i);
      expect(block).toMatch(/\blimit\s+(?:65|129)\b/i);
    }

    for (const indexName of [
      "idx_masjid_display_jumuah_published_date",
      "idx_masjid_display_announcements_published_overlap",
      "idx_masjid_display_events_published_date",
      "idx_masjid_display_campaigns_active_overlap",
    ]) {
      expect(sql).toContain(`create index if not exists ${indexName}`);
    }
  });

  it("returns only bounded mapper projections from public snapshot RPCs", () => {
    const sql = readFileSync(
      "supabase/migrations/20260919023000_masjid_display_feed_bounds.sql",
      "utf8",
    );

    for (const alias of ["j", "a", "e", "c"]) {
      expect(sql).not.toContain(`to_jsonb(${alias}) as row_json`);
    }
    expect(sql).not.toContain("as public_row_json");
    expect((sql.match(/jsonb_build_object\([\s\S]*?\) as row_json/gi) ?? []).length).toBe(4);
    expect((sql.match(/max\(pg_column_size\(row_json\)\)/gi) ?? []).length).toBe(4);
    for (const omittedKey of [
      "'title_en'",
      "'title_tr'",
      "'message_en'",
      "'message_tr'",
      "'description_en'",
      "'description_tr'",
      "'language_en'",
      "'language_tr'",
      "'notes_en'",
      "'notes_tr'",
    ]) {
      expect(sql).not.toContain(omittedKey);
    }

    for (const requiredKey of [
      "'updated_at'",
      "'published'",
      "'title_ar'",
      "'title_de'",
      "'message_ar'",
      "'message_de'",
      "'language_ar'",
      "'language_de'",
    ]) {
      expect(sql).toContain(requiredKey);
    }
  });

  it("preserves legacy Arabic fallback fields in bounded public projections", () => {
    const sql = readFileSync(
      "supabase/migrations/20260919023000_masjid_display_feed_bounds.sql",
      "utf8",
    );

    const sections = {
      jumuah: sql.slice(
        sql.indexOf("create or replace function public.get_masjid_display_jumuah_window"),
        sql.indexOf("create or replace function public.get_masjid_display_announcements_window"),
      ),
      announcements: sql.slice(
        sql.indexOf("create or replace function public.get_masjid_display_announcements_window"),
        sql.indexOf("create or replace function public.get_masjid_display_events_window"),
      ),
      events: sql.slice(
        sql.indexOf("create or replace function public.get_masjid_display_events_window"),
        sql.indexOf("create or replace function public.get_masjid_display_campaigns_window"),
      ),
      campaigns: sql.slice(
        sql.indexOf("create or replace function public.get_masjid_display_campaigns_window"),
      ),
    };

    for (const [section, alias, fields] of [
      [sections.jumuah, "j", ["language", "notes"]],
      [sections.announcements, "a", ["title", "message"]],
      [sections.events, "e", ["title", "description", "location"]],
      [sections.campaigns, "c", ["title", "description"]],
    ] as const) {
      for (const field of fields) {
        expect(section).toContain(`'${field}', case when`);
        expect(section).toContain(`then ${alias}.${field} else null end`);
      }
    }
  });

  it("uses an overlap-indexed announcement candidate search instead of scanning one-sided B-tree ranges", () => {
    const sql = readFileSync(
      "supabase/migrations/20260919023000_masjid_display_feed_bounds.sql",
      "utf8",
    );

    expect(sql).toMatch(
      /create index if not exists idx_masjid_display_announcements_published_overlap[\s\S]+using gist[\s\S]+tstzrange\([\s\S]+where published is true/i,
    );

    const start = sql.indexOf(
      "create or replace function public.get_masjid_display_announcements_window",
    );
    const end = sql.indexOf(
      "create or replace function public.get_masjid_display_events_window",
      start,
    );
    const announcementFunction = sql.slice(start, end);
    expect(announcementFunction).toMatch(
      /tstzrange\(a\.display_from, a\.display_until, '\[\]'\)\s*&&\s*tstzrange\(p_now, p_horizon_end, '\[\]'\)/i,
    );
    expect(announcementFunction).not.toMatch(
      /coalesce\(a\.display_until,[\s\S]+>=\s*p_now[\s\S]+coalesce\(a\.display_from,[\s\S]+<=\s*p_horizon_end/i,
    );
  });

  it("sizes bounded dynamic rows by their public projection rather than duplicated raw columns", () => {
    const sql = readFileSync(
      "supabase/migrations/20260919023000_masjid_display_feed_bounds.sql",
      "utf8",
    );

    expect((sql.match(/jsonb_build_object\([\s\S]*?\) as row_json/gi) ?? []).length).toBe(4);
    expect((sql.match(/max\(pg_column_size\(row_json\)\)/gi) ?? []).length).toBe(4);
    expect(sql).not.toMatch(/to_jsonb\([jaec]\)\s+as\s+row_json/i);
    expect(sql).not.toContain("public_row_json");
  });

  it("uses an overlap-indexed campaign candidate search instead of scanning expired history", () => {
    const sql = readFileSync(
      "supabase/migrations/20260919023000_masjid_display_feed_bounds.sql",
      "utf8",
    );

    expect(sql).toMatch(
      /create index if not exists idx_masjid_display_campaigns_active_overlap[\s\S]+using gist[\s\S]+daterange\([\s\S]+where is_active is true/i,
    );

    const campaignFunction = sql.slice(
      sql.indexOf("create or replace function public.get_masjid_display_campaigns_window"),
    );
    expect(campaignFunction).toMatch(
      /daterange\([\s\S]+\)\s*&&\s*daterange\(p_start_date, p_end_date, '\[\]'\)/i,
    );
    expect(campaignFunction).not.toMatch(
      /c\.start_date\s*<=\s*p_end_date[\s\S]+coalesce\(c\.end_date,[\s\S]+>=\s*p_start_date/i,
    );
  });

  it("preserves prayer note and localized-note fields in the full-chain certification hash", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");
    const fixture = readFileSync(
      "supabase/tests/fixtures/plan5-precutover-production-like.sql",
      "utf8",
    );

    for (const field of ["note", "note_ar", "note_en", "note_de", "note_tr"]) {
      expect(source).toContain(`coalesce(${field}, '')`);
      expect(fixture).toContain(`"${field}"`);
    }
  });
});
