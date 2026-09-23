import { describe, expect, it } from "vitest";
import { formatDateTimeLocalInput, zonedDateTime } from "./date-utils";

describe("formatDateTimeLocalInput", () => {
  it("formats stored instants as Europe/Berlin wall time in summer", () => {
    expect(formatDateTimeLocalInput("2026-09-16T08:00:00.000Z")).toBe("2026-09-16T10:00");
  });

  it("formats stored instants as Europe/Berlin wall time in winter", () => {
    expect(formatDateTimeLocalInput("2026-12-16T09:00:00.000Z")).toBe("2026-12-16T10:00");
  });

  it("keeps empty optional values empty", () => {
    expect(formatDateTimeLocalInput(undefined)).toBe("");
  });
});


describe("zonedDateTime", () => {
  it("chooses the later instant for Europe/Berlin fall-back overlaps", () => {
    expect(zonedDateTime("2026-10-25", "02:30", "Europe/Berlin").toISOString())
      .toBe("2026-10-25T01:30:00.000Z");
  });

  it("chooses the later instant for America/New_York fall-back overlaps", () => {
    expect(zonedDateTime("2026-11-01", "01:30", "America/New_York").toISOString())
      .toBe("2026-11-01T06:30:00.000Z");
  });

  it("shifts nonexistent DST-gap wall times forward like java.time", () => {
    expect(zonedDateTime("2026-03-29", "02:30", "Europe/Berlin").toISOString())
      .toBe("2026-03-29T01:30:00.000Z");
    expect(zonedDateTime("2026-03-08", "02:30", "America/New_York").toISOString())
      .toBe("2026-03-08T07:30:00.000Z");
  });
});
