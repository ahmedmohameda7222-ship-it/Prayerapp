import { describe, expect, it } from "vitest";
import { findLargestPostPrayerFit } from "./post-prayer-fit";

describe("one-page post-prayer text sizing", () => {
  it("keeps the full original size if bilingual text fits", () => {
    expect(findLargestPostPrayerFit((scale) => scale <= 1)).toBe(1);
  });

  it("selects the largest factor that fits an oversized Arabic/German text pair", () => {
    const fitted = findLargestPostPrayerFit((scale) => scale <= .62);
    expect(fitted).toBeGreaterThanOrEqual(.61);
    expect(fitted).toBeLessThanOrEqual(.62);
  });

  it("never returns a non-positive scale for an extremely long verse", () => {
    const fitted = findLargestPostPrayerFit((scale) => scale <= .12);
    expect(fitted).toBeGreaterThan(0);
    expect(fitted).toBeLessThanOrEqual(.12);
  });
});
