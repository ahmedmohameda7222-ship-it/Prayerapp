import { describe, expect, it } from "vitest";
import { getPrayerDisplayNameKey } from "@/lib/prayer-display-name";

describe("Friday Dhuhr display semantics", () => {
  it("renames Dhuhr to Jumuah only on Friday", () => {
    expect(getPrayerDisplayNameKey("dhuhr", "2026-08-21")).toBe("prayer.jumuah");
    expect(getPrayerDisplayNameKey("dhuhr", "2026-08-20")).toBe("prayer.dhuhr");
  });

  it("keeps every other prayer name unchanged on Friday", () => {
    expect(getPrayerDisplayNameKey("fajr", "2026-08-21")).toBe("prayer.fajr");
    expect(getPrayerDisplayNameKey("asr", "2026-08-21")).toBe("prayer.asr");
    expect(getPrayerDisplayNameKey("maghrib", "2026-08-21")).toBe("prayer.maghrib");
    expect(getPrayerDisplayNameKey("isha", "2026-08-21")).toBe("prayer.isha");
  });
});
