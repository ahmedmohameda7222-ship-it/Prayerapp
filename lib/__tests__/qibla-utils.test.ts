import { describe, expect, it } from "vitest";
import {
  ALIGN_ENTER_DEGREES,
  ALIGN_EXIT_DEGREES,
  calculateNeedleRotation,
  calculateQiblaBearing,
  calculateSignedTurnDelta,
  headingFromAlpha,
  isQiblaAligned,
  normalizeDegrees,
  smoothCompassHeading,
} from "@/lib/qibla-utils";

const GOLDEN_BEARINGS = [
  { name: "Deggendorf", latitude: 48.8409, longitude: 12.9607, expected: 132.45 },
  { name: "Berlin", latitude: 52.52, longitude: 13.405, expected: 136.68 },
  { name: "Cairo", latitude: 30.0444, longitude: 31.2357, expected: 136.14 },
  { name: "New York", latitude: 40.7128, longitude: -74.006, expected: 58.48 },
  { name: "Jakarta", latitude: -6.2088, longitude: 106.8456, expected: 295.15 },
  { name: "Sydney", latitude: -33.8688, longitude: 151.2093, expected: 277.5 },
] as const;

describe("Qibla compass helpers", () => {
  it.each(GOLDEN_BEARINGS)("matches the independent golden bearing for $name", (fixture) => {
    expect(calculateQiblaBearing(fixture.latitude, fixture.longitude)).toBeCloseTo(
      fixture.expected,
      1,
    );
  });

  it("normalizes values into a full compass circle", () => {
    expect(normalizeDegrees(-10)).toBe(350);
    expect(normalizeDegrees(725)).toBe(5);
  });

  it("converts orientation alpha into a clockwise compass heading", () => {
    expect(headingFromAlpha(0)).toBe(0);
    expect(headingFromAlpha(90)).toBe(270);
  });

  it("returns a signed shortest-path turn delta", () => {
    expect(calculateSignedTurnDelta(10, 350)).toBe(20);
    expect(calculateSignedTurnDelta(350, 10)).toBe(-20);
    expect(calculateSignedTurnDelta(0, 180)).toBe(-180);
  });

  it("rotates the needle relative to the phone heading", () => {
    expect(calculateNeedleRotation(120, 30)).toBe(90);
    expect(calculateNeedleRotation(10, 350)).toBe(20);
  });

  it("uses the fixed alignment hysteresis thresholds", () => {
    expect(ALIGN_ENTER_DEGREES).toBe(4);
    expect(ALIGN_EXIT_DEGREES).toBe(7);
    expect(isQiblaAligned(3, false)).toBe(true);
    expect(isQiblaAligned(5, true)).toBe(true);
    expect(isQiblaAligned(8, true)).toBe(false);
  });

  it("smooths across north using the shortest path", () => {
    expect(smoothCompassHeading(359, 1, 0.5)).toBe(0);
  });
});
