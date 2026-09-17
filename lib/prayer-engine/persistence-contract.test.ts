import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const persistenceSql = () =>
  readFileSync(
    "supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql",
    "utf8",
  ).toLowerCase();

const iqamaRemovalSql = () =>
  readFileSync(
    "supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql",
    "utf8",
  ).toLowerCase();

const legacyIqamaColumn = (prayer: string) => [prayer, "iqama"].join("_");

describe("prayer persistence migration", () => {
  it("requires caller-supplied mosque-local today and never database current_date", () => {
    const sql = persistenceSql();
    expect(sql).toContain("p_today date");
    expect(sql).not.toContain("current_date");
  });

  it("implements revision-aware extension without overwriting existing dates", () => {
    const sql = persistenceSql();
    expect(sql).toContain("commit_prayer_schedule_extension");
    expect(sql).toContain("applied_calculation_revision");
    expect(sql).toContain("p_expected_first_missing");
    expect(sql).toContain("extension would overwrite existing schedule");
  });

  it("requires recalculation to cover exactly one continuous approved future range", () => {
    const sql = persistenceSql();
    expect(sql).toContain("commit_prayer_schedule_recalculation");
    expect(sql).toContain("p_start_date date");
    expect(sql).toContain("p_end_date date");
    expect(sql).toContain("generate_series(p_start_date, p_end_date, interval '1 day')");
    expect(sql).toContain("recalculation payload must match approved continuous range");
    expect(sql).toContain("on conflict (date) do update");
  });

  it("atomically validates the approved prior-row basis before recalculation writes", () => {
    const sql = persistenceSql();
    expect(sql).toContain("p_expected_rows jsonb");
    expect(sql).toContain("lock table public.prayer_times in share row exclusive mode");
    expect(sql).toContain("prayer schedule changed since preview");
  });

  it("preserves an existing row publication state during recalculation", () => {
    const sql = persistenceSql();
    const conflictUpdate = sql.split("on conflict (date) do update").at(-1) ?? "";
    expect(conflictUpdate).not.toMatch(/\bpublished\s*=\s*true\b/);
  });

  it("keeps a changed calculation revision pending after partial future recalculation", () => {
    const sql = persistenceSql();
    expect(sql).toContain("where date >= p_today");
    expect(sql).toContain("and (date < p_start_date or date > p_end_date)");
    expect(sql).toMatch(
      /if not exists\s*\([\s\S]*?where date >= p_today[\s\S]*?date < p_start_date or date > p_end_date[\s\S]*?\) then[\s\S]*?set applied_calculation_revision = calculation_revision/,
    );
  });

  it("keeps RPC execution service-role only", () => {
    const sql = persistenceSql();
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
  });

  it("does not write legacy absolute Iqama fields", () => {
    expect(persistenceSql()).not.toMatch(/\b(?:fajr|dhuhr|asr|maghrib|isha)_iqama\b/);
  });

  it("fails closed before dropping populated legacy Iqama values without validated shared delays", () => {
    const sql = iqamaRemovalSql();
    expect(sql).toContain("do $$");
    expect(sql).toContain("from public.prayer_settings");
    expect(sql).toContain("where id = '1'");
    expect(sql).toContain("fajr_iqama_delay_minutes");
    expect(sql).toContain("dhuhr_iqama_delay_minutes");
    expect(sql).toContain("asr_iqama_delay_minutes");
    expect(sql).toContain("maghrib_iqama_delay_minutes");
    expect(sql).toContain("isha_iqama_delay_minutes");
    expect(sql).toContain("raise exception");
    for (const prayer of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) {
      expect(sql).toContain(legacyIqamaColumn(prayer));
    }
  });
});