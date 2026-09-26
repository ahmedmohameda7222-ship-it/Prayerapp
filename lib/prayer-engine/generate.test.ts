import { describe, expect, it } from "vitest";
import { validSettings } from "./test-settings";
import {
  buildExtensionPreview,
  buildRecalculationPreview,
} from "./generate";

describe("buildExtensionPreview", () => {
  it("starts at the first internal missing date without overwriting later existing rows", () => {
    const preview = buildExtensionPreview(
      ["2026-09-15", "2026-09-16", "2026-09-18"],
      "2026-09-15",
      validSettings,
    );

    expect(preview.startDate).toBe("2026-09-17");
    expect(preview.expectedFirstMissing).toBe("2026-09-17");
    expect(preview.rows.some((row) => row.date === "2026-09-18")).toBe(false);
  });

  it("uses one calendar year from a leap-day start", () => {
    const preview = buildExtensionPreview([], "2028-02-29", validSettings);
    expect(preview.startDate).toBe("2028-02-29");
    expect(preview.endDate).toBe("2029-02-28");
  });
});

describe("buildRecalculationPreview", () => {
  it("generates a complete continuous approved range including missing rows", () => {
    const preview = buildRecalculationPreview(
      [],
      "2026-09-15",
      "2026-09-17",
      validSettings,
    );

    expect(preview.rows.map((row) => row.date)).toEqual([
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
    ]);
    expect(preview.changedRowCount).toBe(3);
    expect(preview.changedPrayerCount).toBe(18);
  });
});
