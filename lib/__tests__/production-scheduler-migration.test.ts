import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260822200541_public_launch_data_and_scheduler.sql";

function migration() {
  return readFileSync(join(process.cwd(), migrationPath), "utf8");
}

describe("production scheduler migration", () => {
  it("unpublishes only deterministic QA markers before scheduling delivery", () => {
    const sql = migration();
    const unpublishPrayer = sql.indexOf("update public.prayer_times");
    const scheduleCron = sql.indexOf("cron.schedule");

    expect(unpublishPrayer).toBeGreaterThanOrEqual(0);
    expect(sql).toContain("SUPABASE_QA_MOCK");
    expect(sql).toContain("HOME_UI_V2_PREVIEW");
    expect(sql).toContain("update public.jumuah_times");
    expect(sql).toContain("update public.ramadan_days");
    expect(scheduleCron).toBeGreaterThan(unpublishPrayer);
  });

  it("replaces the retired cron target with the canonical origin and preserved Vault token", () => {
    const sql = migration();

    expect(sql).toContain("prayer-reminders-every-minute");
    expect(sql).toContain("https://donaumoschee.vercel.app/api/cron/prayer-reminders");
    expect(sql).not.toContain("masjidelrahman.vercel.app");
    expect(sql).toContain("vault.decrypted_secrets");
    expect(sql).toContain("prayer_reminder_cron_token");
    expect(sql).toContain("timeout_milliseconds := 8000");
  });
});
