import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plan 5 certification integrity", () => {
  it("certifies the complete pending migration chain from the reviewed real-target cutoff snapshot", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");
    const fixturePath = "supabase/tests/fixtures/plan5-precutover-production-like.sql";

    expect(existsSync(fixturePath)).toBe(true);
    expect(source).toContain("20260902223939");
    expect(source).toContain("supabase db reset --local --no-seed --version");
    expect(source).toContain(fixturePath);
    expect(source).not.toMatch(/alter table public\.prayer_times[\s\S]+add column fajr_iqama/i);

    const pendingMigrations = [
      "20260915220000_masjid_display_prayer_settings.sql",
      "20260915221000_prayer_schedule_atomic_generation.sql",
      "20260915222000_masjid_display_admin_schema.sql",
      "20260915223000_remove_absolute_iqama_columns.sql",
      "20260917041000_masjid_display_feed_revision.sql",
      "20260917233500_masjid_display_bounded_generated_at.sql",
      "20260918001500_masjid_display_semantic_source_timestamps.sql",
      "20260918015000_masjid_display_snapshot_window_readers.sql",
      "20260919023000_masjid_display_feed_bounds.sql",
    ];
    let priorIndex = -1;
    for (const migration of pendingMigrations) {
      const index = source.indexOf(migration);
      expect(index, `${migration} must be applied by the certification chain`).toBeGreaterThan(priorIndex);
      priorIndex = index;
    }

    expect(source).toContain("PLAN5_CHAIN_BEFORE prayer_times_count=81");
    expect(source).toContain("PLAN5_CHAIN_BEFORE jumuah_times_count=3");
    expect(source).toContain("PLAN5_CHAIN_AFTER prayer_times_count=81");
    expect(source).toContain("PLAN5_CHAIN_AFTER jumuah_times_count=3");
    expect(source).toContain("PLAN5_CHAIN_BEFORE prayer_times_hash=");
    expect(source).toContain("PLAN5_CHAIN_AFTER prayer_times_hash=");
    expect(source).toContain("PLAN5_CHAIN_BEFORE jumuah_hash=");
    expect(source).toContain("PLAN5_CHAIN_AFTER jumuah_hash=");
    expect(source).toContain("PLAN5_PENDING_CHAIN=PASS");
  });

  it("requires the migration dry run to reject deleted or changed certified prayer rows", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");

    expect(source).toContain("representative prayer row changed or missing");
    expect(source).toMatch(/create temporary table plan5_before_prayer as[\s\S]+select[\s\S]+id,[\s\S]+date,/);
    expect(source).toMatch(
      /from plan5_before_prayer b[\s\S]+where not exists \([\s\S]+select 1[\s\S]+from public\.prayer_times p[\s\S]+p\.id = b\.id/,
    );

    for (const field of ["note", "note_ar", "note_en", "note_de", "note_tr"]) {
      expect(source).toContain(`coalesce(${field}, '')`);
      expect(source).toContain(`coalesce(p.${field}, '')`);
    }
  });

  it("requires the migration dry run to reject deleted or changed certified Jumuah rows", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");

    expect(source).toContain("Jumuah row count changed");
    expect(source).toMatch(
      /from plan5_before_jumuah b[\s\S]+where not exists \([\s\S]+select 1[\s\S]+from public\.jumuah_times j/,
    );

    for (const field of [
      "language_ar",
      "language_en",
      "language_de",
      "language_tr",
      "notes_ar",
      "notes_en",
      "notes_de",
      "notes_tr",
    ]) {
      expect(source).toContain(`coalesce(${field}, '')`);
      expect(source).toContain(`coalesce(j.${field}, '')`);
    }
    for (const sentinel of [
      "PLAN5_JUMUAH_LANGUAGE_AR",
      "PLAN5_JUMUAH_LANGUAGE_EN",
      "PLAN5_JUMUAH_LANGUAGE_DE",
      "PLAN5_JUMUAH_LANGUAGE_TR",
      "PLAN5_JUMUAH_NOTES_AR",
      "PLAN5_JUMUAH_NOTES_EN",
      "PLAN5_JUMUAH_NOTES_DE",
      "PLAN5_JUMUAH_NOTES_TR",
    ]) {
      expect(source).toContain(sentinel);
    }
  });
});
