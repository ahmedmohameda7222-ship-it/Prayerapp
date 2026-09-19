import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260915222000_masjid_display_admin_schema.sql";
const sql = () => readFileSync(migrationPath, "utf8").toLowerCase();

describe("masjid display admin schema", () => {
  it("adds only display-owned settings and temporary test state", () => {
    const source = sql();
    for (const token of [
      "create table public.masjid_display_settings",
      "fajr_prayer_duration_minutes",
      "dhuhr_prayer_duration_minutes",
      "asr_prayer_duration_minutes",
      "maghrib_prayer_duration_minutes",
      "isha_prayer_duration_minutes",
      "azkar_playlist_ids",
      "create table public.masjid_display_test_state",
      "enabled",
      "scenario",
      "payload",
      "started_at",
      "expires_at",
    ]) expect(source).toContain(token);

    for (const forbidden of ["fajr_angle", "latitude", "iqama_delay", "jumuah"]) {
      const settingsBlock = source.split("create table public.masjid_display_settings")[1]?.split(");")[0] ?? "";
      expect(settingsBlock).not.toContain(forbidden);
    }
  });

  it("bounds all five display durations to 2 through 120 minutes", () => {
    const source = sql();
    for (const prayer of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) {
      expect(source).toMatch(new RegExp(`${prayer}_prayer_duration_minutes[\\s\\S]{0,120}between 2 and 120`));
    }
  });

  it("adds announcement scheduling, campaign URL, and canonical public app URL", () => {
    const source = sql();
    for (const token of ["display_style", "display_from", "display_until", "donation_url", "public_app_url"]) {
      expect(source).toContain(token);
    }
    expect(source).toContain("display_style in ('normal', 'special')");
    expect(source).toMatch(/display_until\s*>\s*display_from/);
    expect(source).toMatch(/alter column end_date drop not null/);
  });

  it("enables RLS and grants no anonymous or authenticated writes to new singleton tables", () => {
    const source = sql();
    expect(source).toContain("alter table public.masjid_display_settings enable row level security");
    expect(source).toContain("alter table public.masjid_display_test_state enable row level security");
    expect(source).toContain("revoke all on table public.masjid_display_settings from public, anon, authenticated");
    expect(source).toContain("revoke all on table public.masjid_display_test_state from public, anon, authenticated");
    expect(source).toContain("grant select, insert, update on table public.masjid_display_settings to service_role");
    expect(source).toContain("grant select, insert, update on table public.masjid_display_test_state to service_role");
  });
});
