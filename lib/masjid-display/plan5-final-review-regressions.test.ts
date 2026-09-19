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
      "idx_masjid_display_announcements_published_window",
      "idx_masjid_display_events_published_date",
      "idx_masjid_display_campaigns_active_window",
    ]) {
      expect(sql).toContain(`create index if not exists ${indexName}`);
    }
  });

  it("preserves prayer note and localized-note fields in the rollback certification snapshot", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");

    for (const field of ["note", "note_ar", "note_en", "note_de", "note_tr"]) {
      expect(source).toContain(`coalesce(${field}, '')`);
      expect(source).toContain(`coalesce(p.${field}, '')`);
    }
  });
});
