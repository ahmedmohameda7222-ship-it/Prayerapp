import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plan 6 migration certification integrity", () => {
  it("keeps migration certification documentation aligned with the non-destructive full chain", () => {
    const doc = readFileSync("docs/masjid-display/migration-certification.md", "utf8");

    expect(doc).toContain("Full non-destructive production-like chain");
    expect(doc).toContain("81");
    expect(doc).toContain("3");
    expect(doc).toContain("20260902223939");
    expect(doc).toContain("20,15,15,5,10");
    expect(doc).toContain("PLAN6_PREMERGE_CHAIN=PASS");
    expect(doc).toContain("legacy_iqama_columns=5");
    expect(doc).toContain("Plan 7");
    expect(doc).not.toMatch(/PLAN6_CHAIN_AFTER legacy_iqama_columns=0/);
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
    expect(script).toContain("PLAN6_CONTENT_PREFLIGHT=PASS");
  });

  it("certifies the complete Plan 5/6 migration chain from the reviewed production cutoff", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");
    const fixturePath = "supabase/tests/fixtures/plan5-precutover-production-like.sql";

    expect(existsSync(fixturePath)).toBe(true);
    expect(source).toContain('cutoff_version="20260902223939"');
    expect(source).toContain("supabase db reset --local --no-seed --version");
    expect(source).toContain(fixturePath);

    const pendingMigrations = [
      "20260915220000_masjid_display_prayer_settings.sql",
      "20260915221000_prayer_schedule_atomic_generation.sql",
      "20260915222000_masjid_display_admin_schema.sql",
      "20260915222500_plan6_preserve_legacy_iqama_columns.sql",
      "20260915223000_remove_absolute_iqama_columns.sql",
      "20260915223500_plan6_restore_legacy_iqama_columns.sql",
      "20260917041000_masjid_display_feed_revision.sql",
      "20260917233500_masjid_display_bounded_generated_at.sql",
      "20260918001500_masjid_display_semantic_source_timestamps.sql",
      "20260918015000_masjid_display_snapshot_window_readers.sql",
      "20260919023000_masjid_display_feed_bounds.sql",
      "20260922060000_prayer_event_v3.sql",
      "20260922061000_applied_timezone.sql",
      "20260922062000_masjid_display_dynamic_budget_timezone.sql",
      "20260923030000_published_prayer_schedule_snapshot.sql",
      "20260923100000_prayer_schedule_midnight_write_guards.sql",
      "20260924060000_certified_prayer_timezones.sql",
      "20260924070000_plan6_premerge_runtime_bootstrap.sql",
    ];
    let priorIndex = -1;
    for (const migration of pendingMigrations) {
      const index = source.indexOf(migration);
      expect(index, `${migration} must be applied by the certification chain`).toBeGreaterThan(priorIndex);
      priorIndex = index;
    }

    expect(source).toContain("PLAN6_CHAIN_BEFORE prayer_times_count=");
    expect(source).toContain("PLAN6_CHAIN_BEFORE jumuah_times_count=");
    expect(source).toContain("PLAN6_CHAIN_AFTER prayer_times_count=");
    expect(source).toContain("PLAN6_CHAIN_AFTER jumuah_times_count=");
    expect(source).toContain("PLAN6_CHAIN_BEFORE prayer_times_hash=");
    expect(source).toContain("PLAN6_CHAIN_AFTER prayer_times_hash=");
    expect(source).toContain("PLAN6_CHAIN_BEFORE jumuah_hash=");
    expect(source).toContain("PLAN6_CHAIN_AFTER jumuah_hash=");
    expect(source).toContain("PLAN6_CHAIN_BEFORE legacy_iqama_hash=");
    expect(source).toContain("PLAN6_CHAIN_AFTER legacy_iqama_hash=");
    expect(source).toContain("PLAN6_CHAIN_BEFORE legacy_iqama_coverage=");
    expect(source).toContain("PLAN6_CHAIN_AFTER legacy_iqama_coverage=");
    expect(source).toContain("PLAN6_CHAIN_AFTER legacy_iqama_columns=$legacy_iqama_columns");
    expect(source).toContain("PLAN6_PREMERGE_CHAIN=PASS");
    expect(source).toContain("PLAN6_MIGRATION_DRY_RUN=PASS");
  });

  it("certifies the destructive cutover is explicitly deferred with no compatibility window", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");
    const deferred = readFileSync(
      "supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql",
      "utf8",
    ).toLowerCase();
    const guard = readFileSync(
      "supabase/migrations/20260915222500_plan6_preserve_legacy_iqama_columns.sql",
      "utf8",
    ).toLowerCase();
    const repair = readFileSync(
      "supabase/migrations/20260915223500_plan6_restore_legacy_iqama_columns.sql",
      "utf8",
    ).toLowerCase();

    expect(source).toContain("PLAN6_IQAMA_TRANSITION=PASS");
    expect(source).toContain("before_transition_legacy_hash=");
    expect(source).toContain("after_transition_legacy_hash=");
    expect(source).toContain('[ "$before_transition_legacy_hash" != "$after_transition_legacy_hash" ]');
    expect(source).toContain('[ "$legacy_columns_after_transition" != "5" ]');

    const deferredExecutable = deferred
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    const guardExecutable = guard
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");

    expect(deferredExecutable).not.toMatch(/\bdrop\s+column\b/u);
    expect(deferred).toContain("explicit deferred cutover");
    expect(guardExecutable).not.toMatch(/\brename\s+column\b/u);
    expect(repair).toContain("rename column");
    expect(repair).toContain("add column");
  });

  it("requires the bootstrap to leave calculation parameters pending while making runtime data complete", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");
    const migration = readFileSync(
      "supabase/migrations/20260924070000_plan6_premerge_runtime_bootstrap.sql",
      "utf8",
    );

    expect(migration).toContain("calculation_revision");
    expect(migration).toContain("applied_calculation_revision");
    expect(migration).toContain("'Europe/Berlin'");
    expect(source).toContain('revision_state" != "1,0,1"');
    expect(source).toContain('profile_state" != "false,true,true,true,true,true,true"');
    expect(source).toContain('timezone_state" != "Europe/Berlin,Europe/Berlin"');
    expect(source).toContain('shared_delays" != "20,15,15,5,10"');
    expect(source).toContain('display_state" != "10,10,10,10,10,0"');
    expect(source).toContain('public_app_url" != "https://donaumoschee.vercel.app"');
  });

  it("requires the full-chain dry run to reject deleted or changed certified prayer rows", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");

    expect(source).toContain("before_prayer_count=");
    expect(source).toContain("after_prayer_count=");
    expect(source).toContain("before_prayer_hash=");
    expect(source).toContain("after_prayer_hash=");
    expect(source).toContain('[ "$before_prayer_hash" != "$after_prayer_hash" ]');
    expect(source).toContain("Plan 6 pending migration chain changed preserved prayer_times fields");
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
    expect(source).toContain("Plan 6 pending migration chain changed preserved Jumuah fields");
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
  it("wires runtime-only prayer authority into the production Feed dependencies", () => {
    const source = readFileSync("lib/masjid-display/build-feed.ts", "utf8");
    const start = source.indexOf("const defaultDependencies");
    const end = source.indexOf("export const MAX_MASJID_DISPLAY_FEED_BYTES", start);
    const defaults = source.slice(start, end);

    expect(defaults).toContain("getPrayerRuntimeAuthority,");
    expect(defaults).toContain("getPrayerRuntimeAuthorityForDisplay,");
  });

});
