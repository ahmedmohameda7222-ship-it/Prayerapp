import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const persistenceSql = () =>
  readFileSync(
    "supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql",
    "utf8",
  ).toLowerCase();

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

  it("keeps RPC execution service-role only", () => {
    const sql = persistenceSql();
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
  });

  it("does not write legacy absolute Iqama fields", () => {
    expect(persistenceSql()).not.toMatch(/\b(?:fajr|dhuhr|asr|maghrib|isha)_iqama\b/);
  });
});
