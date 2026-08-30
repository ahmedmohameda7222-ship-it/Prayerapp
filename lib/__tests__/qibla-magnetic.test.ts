import { describe, expect, it } from "vitest";
import { getMagneticDeclination } from "@/lib/qibla-magnetic";

const WMM_TEST_DATE = new Date("2026-08-30T00:00:00Z");

describe("Qibla WMM magnetic declination", () => {
  it("uses the WMM2025 model with the expected declination sign and magnitude in Cairo", async () => {
    const declination = await getMagneticDeclination(30.0444, 31.2357, WMM_TEST_DATE);
    expect(declination).not.toBeNull();
    expect(declination as number).toBeCloseTo(4.8, 0);
  });

  it("uses the WMM2025 model with the expected declination sign and magnitude in New York", async () => {
    const declination = await getMagneticDeclination(40.7128, -74.006, WMM_TEST_DATE);
    expect(declination).not.toBeNull();
    expect(declination as number).toBeCloseTo(-12.5, 0);
  });

  it("fails closed when no supported model exists", async () => {
    await expect(
      getMagneticDeclination(30.0444, 31.2357, new Date("2035-01-01T00:00:00Z")),
    ).resolves.toBeNull();
  });

  it("fails closed for invalid coordinates or dates", async () => {
    await expect(getMagneticDeclination(Number.NaN, 31, WMM_TEST_DATE)).resolves.toBeNull();
    await expect(getMagneticDeclination(30, 181, WMM_TEST_DATE)).resolves.toBeNull();
    await expect(getMagneticDeclination(30, 31, new Date(Number.NaN))).resolves.toBeNull();
  });
});
