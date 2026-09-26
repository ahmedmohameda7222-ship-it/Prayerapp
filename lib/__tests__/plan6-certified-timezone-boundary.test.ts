import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validSettings } from "@/lib/prayer-engine/test-settings";
import { validatePrayerCalculationSettings } from "@/lib/prayer-engine/validate-settings";

const source = (path: string) => readFileSync(path, "utf8");

describe("Plan 6 certified cross-runtime prayer timezones", () => {
  it("rejects a valid IANA zone that is outside the certified cross-runtime set", () => {
    expect(() =>
      validatePrayerCalculationSettings({
        ...validSettings,
        timezone: "Pacific/Chatham",
      }),
    ).toThrow(/certified|timezone/i);
  });

  it("keeps the root and TV certified timezone policy identical", () => {
    const root = source("lib/prayer-engine/certified-timezones.ts");
    const tv = source("masjid-display/lib/certified-timezones.ts");
    expect(tv).toBe(root);
    expect(root).toContain("Europe/Berlin");
    expect(root).toContain("America/New_York");
    expect(root).toContain("Asia/Tokyo");
  });

  it("makes TV feed validation enforce the certified timezone policy", () => {
    const validator = source("masjid-display/lib/validate-feed.ts");
    expect(validator).toContain('from "./certified-timezones"');
    expect(validator).toContain("isCertifiedPrayerTimezone(timezone)");
  });

  it("enforces certified timezone rules on atomic published prayer snapshots", () => {
    const snapshot = source("lib/data/prayer-schedule-snapshot.ts");
    expect(snapshot).toContain('from "@/lib/prayer-engine/certified-timezones"');
    expect(snapshot).toContain("isCertifiedPrayerTimezone(timezone)");
    expect(snapshot).toContain("hasCertifiedPrayerTimezoneRules(timezone)");
    expect(snapshot).not.toContain('new Intl.DateTimeFormat("en-US", { timeZone: timezone })');
  });

  it("exposes certified timezone choices in Prayer Engine Admin", () => {
    const admin = source("app/admin/prayer-engine/PrayerEngineAdmin.tsx");
    expect(admin).toContain("CERTIFIED_PRAYER_TIMEZONES");
    expect(admin).toContain("CERTIFIED_PRAYER_TIMEZONES.map");
    expect(admin).toContain("option key={timezone}");
  });

  it("certifies and constrains the same timezone set in PostgreSQL", () => {
    const migrationName = readdirSync("supabase/migrations")
      .sort()
      .find((name) => name.includes("certified_prayer_timezones"));
    expect(migrationName).toBeTruthy();
    if (!migrationName) return;
    const sql = source(`supabase/migrations/${migrationName}`);
    expect(sql).toContain("pg_timezone_names");
    expect(sql).toContain("prayer_settings_timezone_certified");
    expect(sql).toContain("Europe/Berlin");
    expect(sql).toContain("America/New_York");
    expect(sql).toContain("Asia/Tokyo");
  });
});
