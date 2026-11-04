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

  it("accepts a certified operator-selected IANA timezone", () => {
    expect(validSettings.timezone).toBe(APP_TIME_ZONE);
    expect(
      validatePrayerCalculationSettings({
        ...validSettings,
        timezone: "America/New_York",
      }).timezone,
    ).toBe("America/New_York");
  });

  it("rejects valid IANA zones outside the certified cross-runtime set", () => {
    expect(() =>
      validatePrayerCalculationSettings({
        ...validSettings,
        timezone: "Pacific/Chatham",
      }),
    ).toThrow(/certified|timezone/i);
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

  it("accepts bounded fractional-minute astronomy offsets and a Maghrib solar angle", () => {
    const validated = validatePrayerCalculationSettings({
      ...validSettings,
      maghribAngle: 1.33,
      offsets: { ...validSettings.offsets, fajr: 15.15833, maghrib: 3.99167 },
    });
    expect(validated.maghribAngle).toBe(1.33);
    expect(validated.offsets.fajr).toBe(15.15833);
    expect(validated.offsets.maghrib).toBe(3.99167);
  });

  it("enforces bounded angle, offset, Iqama-delay, and revision ranges", () => {
    expect(() =>
      validatePrayerCalculationSettings({
        ...validSettings,
        maghribAngle: 31,
      }),
    ).toThrow();
    expect(() =>
      validatePrayerCalculationSettings({
        ...validSettings,
        maghribAngle: -1,
      }),
    ).toThrow();
    expect(() =>
      validatePrayerCalculationSettings({
        ...validSettings,
        offsets: { ...validSettings.offsets, fajr: 60.00001 },
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