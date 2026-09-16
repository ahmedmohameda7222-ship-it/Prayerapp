import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  prayerSettingsInsertValues,
  prayerSettingsUpdateValues,
} from "./prayer-settings";
import { validSettings } from "@/lib/prayer-engine/test-settings";

describe("prayer settings persistence mapping", () => {
  it("initial insert stores applied revision zero", () => {
    expect(
      prayerSettingsInsertValues({
        ...validSettings,
        appliedCalculationRevision: 99,
      }).applied_calculation_revision,
    ).toBe(0);
  });

  it("settings updates never write applied_calculation_revision", () => {
    expect(
      prayerSettingsUpdateValues(validSettings),
    ).not.toHaveProperty("applied_calculation_revision");
  });

  it("versions every settings save independently of calculation revision", () => {
    const source = readFileSync("lib/data/prayer-settings.ts", "utf8");
    const schema = readFileSync(
      "supabase/migrations/20260915220000_masjid_display_prayer_settings.sql",
      "utf8",
    ).toLowerCase();

    expect(schema).toContain("row_revision bigint not null default 1");
    expect(source).toContain('.eq("row_revision", currentRow.rowRevision)');
    expect(source).toContain("row_revision: currentRow.rowRevision + 1");
  });

  it("advances row revision when schedule synchronization mutates prayer settings", () => {
    const persistence = readFileSync(
      "supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql",
      "utf8",
    ).toLowerCase();
    expect(persistence).toContain("row_revision = row_revision + 1");
  });
});