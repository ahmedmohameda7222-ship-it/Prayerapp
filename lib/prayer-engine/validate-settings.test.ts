import { describe, expect, it } from "vitest";
import { APP_TIME_ZONE } from "@/lib/date-utils";
import { validSettings } from "./test-settings";
import { validatePrayerCalculationSettings } from "./validate-settings";

describe("validatePrayerCalculationSettings", () => {
  it("accepts zero Iqama delay", () => {
    expect(validatePrayerCalculationSettings(validSettings).iqamaDelays.fajr).toBe(0);
  });

  it("rejects unknown high-latitude rules", () => {
    expect(() =>
      validatePrayerCalculationSettings({
        ...validSettings,
        highLatitudeRule: "unknown",
      }),
    ).toThrow();
  });

  it("rejects invalid IANA timezones", () => {
    expect(() =>
      validatePrayerCalculationSettings({ ...validSettings, timezone: "Berlin" }),
    ).toThrow();
  });

  it("restricts prayer calculation to the canonical mosque timezone", () => {
    expect(validSettings.timezone).toBe(APP_TIME_ZONE);
    expect(() =>
      validatePrayerCalculationSettings({ ...validSettings, timezone: "UTC" }),
    ).toThrow("Invalid timezone");
  });

  it("requires exactly the fields for the selected Isha rule", () => {
    expect(() =>
      validatePrayerCalculationSettings({
        ...validSettings,
        ishaRule: "fixed_minutes",
        ishaAngle: 17,
        ishaMinutesAfterMaghrib: 90,
      }),
    ).toThrow();

    expect(
      validatePrayerCalculationSettings({
        ...validSettings,
        ishaRule: "fixed_minutes",
        ishaAngle: null,
        ishaMinutesAfterMaghrib: 90,
      }).ishaMinutesAfterMaghrib,
    ).toBe(90);
  });

  it("enforces integer offset, delay, and revision ranges", () => {
    expect(() =>
      validatePrayerCalculationSettings({
        ...validSettings,
        offsets: { ...validSettings.offsets, fajr: 1.5 },
      }),
    ).toThrow();
    expect(() =>
      validatePrayerCalculationSettings({
        ...validSettings,
        iqamaDelays: { ...validSettings.iqamaDelays, isha: -1 },
      }),
    ).toThrow();
    expect(() =>
      validatePrayerCalculationSettings({
        ...validSettings,
        calculationRevision: 0,
      }),
    ).toThrow();
  });
});