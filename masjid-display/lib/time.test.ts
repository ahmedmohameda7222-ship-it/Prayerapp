import { describe, expect, it } from "vitest";
import { zonedDateTime } from "./time";

describe("TV wall-time resolution", () => {
  it("uses the later instant during fall-back overlaps in eastern and western IANA zones", () => {
    expect(
      zonedDateTime("2026-10-25", "02:30", "Europe/Berlin").toISOString(),
    ).toBe("2026-10-25T01:30:00.000Z");

    expect(
      zonedDateTime("2026-11-01", "01:30", "America/New_York").toISOString(),
    ).toBe("2026-11-01T06:30:00.000Z");
  });

  it("shifts nonexistent spring-forward wall times forward by the DST gap", () => {
    expect(
      zonedDateTime("2026-03-08", "02:30", "America/New_York").toISOString(),
    ).toBe("2026-03-08T07:30:00.000Z");
  });
});
