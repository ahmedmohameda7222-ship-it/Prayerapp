import { describe, expect, it } from "vitest";

import {
  getAdhanSoundsForPrayer,
  isAdhanSoundId,
  normalizeAdhanSoundId,
} from "@/lib/adhan-audio";

describe("Adhan audio reliability", () => {
  it("does not offer the provider's broken Fajr Madinah source for new selection", () => {
    const fajrIds = getAdhanSoundsForPrayer("fajr").map((sound) => sound.id);

    expect(fajrIds).toContain("fajr-cairo");
    expect(fajrIds).toContain("fajr-makkah");
    expect(fajrIds).not.toContain("fajr-madinah");
  });

  it("preserves the legacy Fajr Madinah id for stored-config compatibility", () => {
    expect(isAdhanSoundId("fajr-madinah")).toBe(true);
    expect(normalizeAdhanSoundId("fajr-madinah", "fajr")).toBe("fajr-madinah");
  });
});
