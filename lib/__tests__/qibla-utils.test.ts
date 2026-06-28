import { describe, expect, it } from "vitest";
import {
  calculateNeedleRotation,
  headingFromAlpha,
  normalizeDegrees,
  smoothCompassHeading,
} from "@/lib/qibla-utils";

describe("Qibla compass helpers", () => {
  it("normalizes values into a full compass circle", () => {
    expect(normalizeDegrees(-10)).toBe(350);
    expect(normalizeDegrees(725)).toBe(5);
  });

  it("converts orientation alpha into a clockwise compass heading", () => {
    expect(headingFromAlpha(0)).toBe(0);
    expect(headingFromAlpha(90)).toBe(270);
  });

  it("rotates the needle relative to the phone heading", () => {
    expect(calculateNeedleRotation(120, 30)).toBe(90);
    expect(calculateNeedleRotation(10, 350)).toBe(20);
  });

  it("smooths across north using the shortest path", () => {
    expect(smoothCompassHeading(359, 1, 0.5)).toBe(0);
  });
});
