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
});
