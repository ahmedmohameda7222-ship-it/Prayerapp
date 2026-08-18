import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("prayer reminder timing contract", () => {
  it("stores one of the supported per-prayer lead times together with the prayer Adhan", () => {
    const migration = source("supabase/migrations/20260816013933_prayer_reminder_lead_minutes.sql");
    const card = source("components/prayer/HomePrayerTimesCard.tsx");

    expect(migration).toContain("lead_minutes in (0, 5, 10, 15)");
    expect(card).toContain("reminderOptions");
    expect(card).toContain("lead_minutes: normalizedLeadMinutes");
    expect(card).toContain("adhan_sound_id: adhanSoundId");
    expect(card).toContain("option === 0 ? copy.atAdhan");
  });

  it("sends a pre-Adhan push only for selected lead times and always sends an Adhan push", () => {
    const cron = source("app/api/cron/prayer-reminders/route.ts");

    expect(cron).toContain("supportedLeadMinutes = [5, 10, 15]");
    expect(cron).toContain("item.lead_minutes === leadMinutes");
    expect(cron).toContain(":before:${leadMinutes}");
    expect(cron).toContain(":adhan");
    expect(cron).toContain("nowMs >= adhanAt");
    expect(cron).toContain('.eq("published", true)');
    expect(cron).not.toContain("QA_MOCK_MARKER");
  });
});