import { describe, expect, it } from "vitest";
import { formatDateTimeLocalInput } from "./date-utils";

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
