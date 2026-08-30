import { describe, expect, it } from "vitest";
import {
  MAX_LIVE_TILT_DEGREES,
  classifyWebkitCompassAccuracy,
  isValidWebkitCompassHeading,
  isWithinLiveTilt,
  magneticToTrueHeading,
  resolveTrueHeading,
  standardAbsoluteHeadingFromAlpha,
  type HeadingSample,
} from "@/lib/qibla-heading";

describe("Qibla trusted heading model", () => {
  it.each([
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    [-1, false],
    [0, true],
    [359.9, true],
    [360, false],
  ])("validates WebKit heading %s", (value, expected) => {
    expect(isValidWebkitCompassHeading(value)).toBe(expected);
  });

  it("classifies WebKit compass accuracy", () => {
    expect(classifyWebkitCompassAccuracy(-1)).toBe("unusable");
    expect(classifyWebkitCompassAccuracy(0)).toBe("usable");
    expect(classifyWebkitCompassAccuracy(25)).toBe("usable");
    expect(classifyWebkitCompassAccuracy(25.1)).toBe("calibration-required");
    expect(classifyWebkitCompassAccuracy(undefined)).toBe("unknown");
    expect(classifyWebkitCompassAccuracy(Number.NaN)).toBe("unknown");
  });

  it("converts magnetic headings to true north using signed declination", () => {
    expect(magneticToTrueHeading(100, 5)).toBe(105);
    expect(magneticToTrueHeading(358, 5)).toBe(3);
    expect(magneticToTrueHeading(10, -12)).toBe(358);
  });

  it("converts finite standard absolute alpha to true heading", () => {
    expect(standardAbsoluteHeadingFromAlpha(0)).toBe(0);
    expect(standardAbsoluteHeadingFromAlpha(90)).toBe(270);
    expect(standardAbsoluteHeadingFromAlpha(Number.NaN)).toBeNull();
  });

  it("requires both beta and gamma to be finite and within the live tilt envelope", () => {
    expect(MAX_LIVE_TILT_DEGREES).toBe(35);
    expect(isWithinLiveTilt(35, -35)).toBe(true);
    expect(isWithinLiveTilt(35.1, 0)).toBe(false);
    expect(isWithinLiveTilt(0, -35.1)).toBe(false);
    expect(isWithinLiveTilt(null, 0)).toBe(false);
    expect(isWithinLiveTilt(0, Number.NaN)).toBe(false);
  });

  it("never converts a relative sample into an accepted true heading", () => {
    const relative: HeadingSample = {
      heading: 120,
      reference: "relative",
      source: "relative",
      accuracyDegrees: null,
      beta: 0,
      gamma: 0,
    };
    expect(resolveTrueHeading(relative, 5)).toBeNull();
  });

  it("fails magnetic samples closed without declination", () => {
    const magnetic: HeadingSample = {
      heading: 100,
      reference: "magnetic",
      source: "webkit-magnetic",
      accuracyDegrees: 10,
      beta: 0,
      gamma: 0,
    };
    expect(resolveTrueHeading(magnetic)).toBeNull();
    expect(resolveTrueHeading(magnetic, 5)).toBe(105);
  });

  it("accepts a valid standard absolute true-heading sample", () => {
    const absolute: HeadingSample = {
      heading: 270,
      reference: "true",
      source: "standard-absolute",
      accuracyDegrees: null,
      beta: 0,
      gamma: 0,
    };
    expect(resolveTrueHeading(absolute)).toBe(270);
  });
});
