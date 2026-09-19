import { describe, expect, it } from "vitest";
import { pixelShiftForEpoch } from "./pixel-shift";

const ALLOWED_OFFSETS = new Set([-4, -2, 0, 2, 4]);

describe("burn-in pixel shift", () => {
  it("keeps every offset inside the four-pixel safe frame", () => {
    for (let epoch = 0; epoch < 100; epoch += 1) {
      const shift = pixelShiftForEpoch(epoch);
      expect(Math.abs(shift.x)).toBeLessThanOrEqual(4);
      expect(Math.abs(shift.y)).toBeLessThanOrEqual(4);
      expect(ALLOWED_OFFSETS.has(shift.x)).toBe(true);
      expect(ALLOWED_OFFSETS.has(shift.y)).toBe(true);
    }
  });

  it("is deterministic for the same slow epoch", () => {
    expect(pixelShiftForEpoch(42)).toEqual(pixelShiftForEpoch(42));
    expect(pixelShiftForEpoch(4_200)).toEqual(pixelShiftForEpoch(4_200));
  });

  it("moves across more than one safe-frame position over time", () => {
    const positions = new Set(
      Array.from({ length: 20 }, (_, epoch) => JSON.stringify(pixelShiftForEpoch(epoch))),
    );
    expect(positions.size).toBeGreaterThan(1);
  });
});
