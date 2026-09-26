import { describe, expect, it } from "vitest";
import { ceilInstantToLocalMinute } from "./rounding";

describe("ceilInstantToLocalMinute", () => {
  it.each([
    ["2026-01-15T15:42:00.000Z", "16:42"],
    ["2026-01-15T15:42:01.000Z", "16:43"],
    ["2026-01-15T15:42:59.999Z", "16:43"],
  ])("ceil %s", (iso, expected) => {
    expect(ceilInstantToLocalMinute(new Date(iso), "Europe/Berlin")).toBe(expected);
  });

  it("formats the same instant with DST through the IANA timezone", () => {
    expect(
      ceilInstantToLocalMinute(
        new Date("2026-07-15T14:42:00.000Z"),
        "Europe/Berlin",
      ),
    ).toBe("16:42");
  });
});
