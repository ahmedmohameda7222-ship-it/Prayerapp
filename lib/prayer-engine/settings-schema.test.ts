import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settingsSql = () =>
  readFileSync(
    "supabase/migrations/20260915220000_masjid_display_prayer_settings.sql",
    "utf8",
  ).toLowerCase();

describe("prayer settings migration", () => {
  it("contains canonical settings, revisions, offsets, and five required delays", () => {
    for (const token of [
      "create table public.prayer_settings",
      "timezone text not null",
      "high_latitude_rule",
      "calculation_revision",
      "applied_calculation_revision",
      "fajr_offset_minutes",
      "sunrise_offset_minutes",
      "dhuhr_offset_minutes",
      "asr_offset_minutes",
      "maghrib_offset_minutes",
      "isha_offset_minutes",
      "fajr_iqama_delay_minutes",
      "dhuhr_iqama_delay_minutes",
      "asr_iqama_delay_minutes",
      "maghrib_iqama_delay_minutes",
      "isha_iqama_delay_minutes",
      "enable row level security",
    ]) {
      expect(settingsSql()).toContain(token);
    }
  });

  it("does not seed an invented production calculation profile", () => {
    expect(settingsSql()).not.toContain("insert into public.prayer_settings");
  });
});
