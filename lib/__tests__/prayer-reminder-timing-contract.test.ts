import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("prayer reminder timing contract", () => {
  it("stores one of the supported per-prayer lead times", () => {
    const migration = source("supabase/migrations/20260816013933_prayer_reminder_lead_minutes.sql");
    const card = source("components/prayer/HomePrayerTimesCard.tsx");

    expect(migration).toContain("lead_minutes in (0, 5, 10, 15)");
    expect(card).toContain("reminderOptions");
    expect(card).toContain("lead_minutes: leadMinutes");
    expect(card).toContain("option === 0 ? copy.adhanOnly");
  });

  it("stores a separate Adhan choice for every prayer", () => {
    const migration = source("supabase/migrations/20260816023654_per_prayer_adhan_sound.sql");
    const card = source("components/prayer/HomePrayerTimesCard.tsx");
    const audio = source("lib/adhan-audio.ts");
    const provider = source("components/providers/AdhanAudioProvider.tsx");

    expect(migration).toContain("adhan_sound_id");
    expect(migration).toContain("'egyptian', 'fajr', 'makkah', 'madinah'");
    expect(card).toContain("adhan_sound_id: adhanSoundId");
    expect(card).toContain("copy.adhanTitle");
    expect(card).toContain("previewSound(sound.id)");
    expect(card).toContain("setDraftSoundId(sound.id)");
    expect(audio).toContain('fajr: "fajr"');
    expect(audio).toContain('dhuhr: "egyptian"');
    expect(provider).toContain("prayerSounds[data.prayer]");
  });

  it("sends a pre-Adhan push only for selected lead times and always sends an Adhan push", () => {
    const cron = source("app/api/cron/prayer-reminders/route.ts");

    expect(cron).toContain("supportedLeadMinutes = [5, 10, 15]");
    expect(cron).toContain("item.lead_minutes === leadMinutes");
    expect(cron).toContain(":before:${leadMinutes}");
    expect(cron).toContain(":adhan");
    expect(cron).toContain("nowMs >= adhanAt");
    expect(cron).toContain("schedule.note !== QA_MOCK_MARKER");
  });
});
