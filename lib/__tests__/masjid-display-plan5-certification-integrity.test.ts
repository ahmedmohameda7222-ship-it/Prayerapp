import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plan 5 certification integrity", () => {
  it("keeps migration certification documentation aligned with the full pending-chain gate", () => {
    const doc = readFileSync("docs/masjid-display/migration-certification.md", "utf8");

    expect(doc).toContain("full pending migration chain");
    expect(doc).toContain("81");
    expect(doc).toContain("3");
    expect(doc).toContain("20260902223939");
    expect(doc).toContain("20,15,15,5,10");
    expect(doc).toContain("PLAN5_PENDING_CHAIN=PASS");
    expect(doc).not.toMatch(/wraps the successful cutover exercise in a transaction that is rolled back/i);
    expect(doc).not.toMatch(/BEFORE prayer row count:\s*`2`/);
    expect(doc).not.toMatch(/BEFORE\/AFTER Jumuah count:\s*`1`/);
  });

  it("keeps the reusable capacity assertion as valid PL/pgSQL", () => {
    const migration = readFileSync(
      "supabase/migrations/20260919023000_masjid_display_feed_bounds.sql",
      "utf8",
    );
    const start = migration.indexOf(
      "create or replace function public.assert_masjid_display_dynamic_content_budget()",
    );
    const end = migration.indexOf(
      "revoke all on function public.assert_masjid_display_dynamic_content_budget()",
      start,
    );
    const assertionFunction = migration.slice(start, end);

    const dollar = String.fromCharCode(36);
    expect(assertionFunction).toContain("return;\nend;\n" + dollar + dollar + ";");
    expect(assertionFunction).not.toContain("return;\nend;\n" + dollar + ";");
  });

  it("requires an existing-content capacity preflight before capacity triggers are enabled", () => {
    const migration = readFileSync(
      "supabase/migrations/20260919023000_masjid_display_feed_bounds.sql",
      "utf8",
    );
    const script = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");

    expect(migration).toContain(
      "create or replace function public.assert_masjid_display_dynamic_content_budget()",
    );
    const preflightIndex = migration.indexOf(
      "select public.assert_masjid_display_dynamic_content_budget();",
    );
    const firstTriggerIndex = migration.indexOf(
      "create trigger trg_masjid_display_dynamic_budget_announcements",
    );
    expect(preflightIndex).toBeGreaterThan(-1);
    expect(firstTriggerIndex).toBeGreaterThan(preflightIndex);
    expect(migration).toMatch(
      /create or replace function public\.enforce_masjid_display_dynamic_content_budget\(\)[\s\S]+perform public\.assert_masjid_display_dynamic_content_budget\(\)/,
    );
    expect(script).toContain("PLAN5_CONTENT_PREFLIGHT=PASS");
  });

  it("certifies the complete pending migration chain from the reviewed real-target cutoff snapshot", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");
    const fixturePath = "supabase/tests/fixtures/plan5-precutover-production-like.sql";

    expect(existsSync(fixturePath)).toBe(true);
    expect(source).toContain("20260902223939");
    expect(source).toContain("supabase db reset --local --no-seed --version");
    expect(source).toContain(fixturePath);
    const legacyFajrColumn = ["fajr", "iqama"].join("_");
    expect(source).not.toMatch(
      new RegExp(
        "alter table public\\.prayer_times[\\s\\S]+add column " + legacyFajrColumn,
        "i",
      ),
    );

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

  it("requires the full-chain dry run to reject deleted or changed certified prayer rows", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");

    expect(source).toContain("before_prayer_count=");
    expect(source).toContain("after_prayer_count=");
    expect(source).toContain("before_prayer_hash=");
    expect(source).toContain("after_prayer_hash=");
    expect(source).toContain('[ "$before_prayer_hash" != "$after_prayer_hash" ]');
    expect(source).toContain("Plan 5 pending migration chain changed preserved prayer_times fields");
    for (const field of [
      "id::text",
      "date::text",
      "fajr",
      "sunrise",
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
      "note",
      "note_ar",
      "note_en",
      "note_de",
      "note_tr",
      "updated_at::text",
      "maghrib_program_enabled::text",
      "maghrib_lesson_title",
      "maghrib_lesson_duration_minutes::text",
      "maghrib_combined_isha_time",
    ]) {
      expect(source).toContain(field);
    }
  });

  it("requires the full-chain dry run to reject deleted or changed certified Jumuah rows", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");

    expect(source).toContain("before_jumuah_count=");
    expect(source).toContain("after_jumuah_count=");
    expect(source).toContain("before_jumuah_hash=");
    expect(source).toContain("after_jumuah_hash=");
    expect(source).toContain('[ "$before_jumuah_hash" != "$after_jumuah_hash" ]');
    expect(source).toContain("Plan 5 pending migration chain changed preserved Jumuah fields");
    for (const field of [
      "location_name",
      "location_address",
      "khateeb_name",
      "language",
      "language_ar",
      "language_en",
      "language_de",
      "language_tr",
      "notes",
      "notes_ar",
      "notes_en",
      "notes_de",
      "notes_tr",
      "updated_at::text",
    ]) {
      expect(source).toContain(field);
    }
  });
});
