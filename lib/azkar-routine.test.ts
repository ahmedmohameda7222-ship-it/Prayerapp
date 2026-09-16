import { describe, expect, it } from "vitest";
import { smartAzkarCategory } from "./azkar-routine";

const at = (iso: string) => new Date(iso);

describe("smartAzkarCategory", () => {
  it("selects Friday before time-of-day rules", () => {
    expect(smartAzkarCategory(at("2026-09-18T11:00:00Z"))).toBe("Friday");
  });

  it("uses Morning from 04:00 through 11:59 mosque-local time", () => {
    expect(smartAzkarCategory(at("2026-09-17T02:00:00Z"))).toBe("Morning");
    expect(smartAzkarCategory(at("2026-09-17T09:59:00Z"))).toBe("Morning");
  });

  it("uses Morning for the remaining daytime hours", () => {
    expect(smartAzkarCategory(at("2026-09-17T10:00:00Z"))).toBe("Morning");
    expect(smartAzkarCategory(at("2026-09-17T12:59:00Z"))).toBe("Morning");
  });

  it("uses Evening from 15:00 through 21:59 mosque-local time", () => {
    expect(smartAzkarCategory(at("2026-09-17T13:00:00Z"))).toBe("Evening");
    expect(smartAzkarCategory(at("2026-09-17T19:59:00Z"))).toBe("Evening");
  });

  it("uses Sleep from 22:00 through 03:59 mosque-local time outside Friday", () => {
    expect(smartAzkarCategory(at("2026-09-17T20:00:00Z"))).toBe("Sleep");
    expect(smartAzkarCategory(at("2026-09-17T01:59:00Z"))).toBe("Sleep");
  });
});
