import { describe, expect, it } from "vitest";
import {
  DEFAULT_FAJR_ADHAN_SOUND_ID,
  DEFAULT_REGULAR_ADHAN_SOUND_ID,
  getAdhanSound,
  getAdhanSoundsForPrayer,
  normalizeAdhanSoundId,
} from "@/lib/adhan-audio";

describe("prayer-aware Adhan catalog", () => {
  it("keeps selectable Fajr recordings separate from regular prayer recordings", () => {
    const fajrSounds = getAdhanSoundsForPrayer("fajr");
    const dhuhrSounds = getAdhanSoundsForPrayer("dhuhr");

    expect(fajrSounds.length).toBeGreaterThanOrEqual(2);
    expect(dhuhrSounds.length).toBeGreaterThanOrEqual(6);
    expect(fajrSounds.every((sound) => sound.kind === "fajr")).toBe(true);
    expect(dhuhrSounds.every((sound) => sound.kind === "regular")).toBe(true);
    expect(fajrSounds.some((sound) => sound.id === "fajr-madinah")).toBe(false);
  });

  it("uses stable prayer-specific defaults", () => {
    expect(DEFAULT_FAJR_ADHAN_SOUND_ID).toBe("fajr-cairo");
    expect(DEFAULT_REGULAR_ADHAN_SOUND_ID).toBe("abdul-basit-cairo");
    expect(getAdhanSound(DEFAULT_FAJR_ADHAN_SOUND_ID).kind).toBe("fajr");
    expect(getAdhanSound(DEFAULT_REGULAR_ADHAN_SOUND_ID).kind).toBe("regular");
  });

  it("uses the verified direct MP3 for Abdul Basit instead of the broken download endpoint", () => {
    const sound = getAdhanSound("abdul-basit-cairo");
    expect(sound.audioUrl).toBe("https://www.ashefaa.com/ruqia/Azan/62.mp3");
    expect(sound.audioUrl).not.toContain("doaatv.com/download");
  });

  it("normalizes legacy and incompatible selections safely", () => {
    expect(normalizeAdhanSoundId("fajr", "fajr")).toBe("fajr-cairo");
    expect(normalizeAdhanSoundId("makkah", "fajr")).toBe("fajr-makkah");
    expect(normalizeAdhanSoundId("madinah", "fajr")).toBe("fajr-cairo");
    expect(normalizeAdhanSoundId("fajr-madinah", "fajr")).toBe("fajr-madinah");
    expect(normalizeAdhanSoundId("adhan-1", "dhuhr")).toBe("abdul-basit-cairo");
    expect(normalizeAdhanSoundId("fajr-cairo", "asr")).toBe("abdul-basit-cairo");
  });
});
