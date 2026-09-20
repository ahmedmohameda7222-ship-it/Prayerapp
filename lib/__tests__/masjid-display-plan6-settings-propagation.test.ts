import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveIqamaInstant } from "@/lib/prayer-utils";

const read = (path: string) => readFileSync(path, "utf8");

describe("Plan 6 settings-driven Masjid Display runtime", () => {
  it("wires every Prayer Engine calculation setting from Admin through persistence into calculation", () => {
    const admin = read("app/admin/prayer-engine/PrayerEngineAdmin.tsx");
    const persistence = read("lib/data/prayer-settings.ts");
    const calculation = read("lib/prayer-engine/calculate.ts");

    expect(calculation).toContain("settings.timezone");
    expect(read("lib/masjid-display/build-feed.ts")).not.toContain("timezone: APP_TIME_ZONE");

    for (const field of [
      "latitude",
      "longitude",
      "timezone",
      "fajrAngle",
      "ishaRule",
      "ishaAngle",
      "ishaMinutesAfterMaghrib",
      "asrShadowFactor",
      "highLatitudeRule",
    ]) {
      expect(admin).toContain(field);
      expect(calculation).toContain(`settings.${field}`);
    }

    for (const column of [
      "latitude",
      "longitude",
      "timezone",
      "fajr_angle",
      "isha_rule",
      "isha_angle",
      "isha_minutes_after_maghrib",
      "asr_shadow_factor",
      "high_latitude_rule",
      "fajr_offset_minutes",
      "sunrise_offset_minutes",
      "dhuhr_offset_minutes",
      "asr_offset_minutes",
      "maghrib_offset_minutes",
      "isha_offset_minutes",
    ]) {
      expect(persistence).toContain(column);
    }

    expect(admin).toContain('form[`offset_${prayer}`]');
    expect(admin).toContain('onChange={(e) => update(`offset_${prayer}`, e.target.value)}');
    expect(calculation).toContain("settings.offsets[key]");
  });

  it("wires all five shared Iqama delays and derives Iqama from stored prayer start plus delay", () => {
    const admin = read("app/admin/prayer-engine/PrayerEngineAdmin.tsx");
    const persistence = read("lib/data/prayer-settings.ts");
    const feed = read("lib/masjid-display/build-feed.ts");
    const tv = read("masjid-display/lib/state/prayer-state.ts");

    expect(admin).toContain('form[`iqama_${prayer}`]');
    expect(admin).toContain('onChange={(e) => update(`iqama_${prayer}`, e.target.value)}');
    for (const prayer of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) {
      expect(persistence).toContain(`${prayer}_iqama_delay_minutes`);
      expect(feed).toContain(`prayerSettings.iqamaDelays.${prayer}`);
    }

    expect(tv).toContain("const iqamaInstant = prayerInstant + delay * MINUTE_MS");
    expect(deriveIqamaInstant("2026-09-21", "13:00", 15).getTime())
      .toBe(deriveIqamaInstant("2026-09-21", "13:00", 0).getTime() + 15 * 60_000);
  });

  it("wires five prayer durations and the Azkar playlist through Admin, persistence, Feed, and TV", () => {
    const admin = read("app/admin/masjid-display/page.tsx");
    const action = read("app/admin/masjid-display/actions.ts");
    const persistence = read("lib/data/masjid-display-settings.ts");
    const feed = read("lib/masjid-display/build-feed.ts");
    const tv = read("masjid-display/lib/state/prayer-state.ts");

    for (const prayer of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) {
      expect(admin).toContain(`${prayer}PrayerDurationMinutes`);
      expect(action).toContain(`${prayer}_prayer_duration_minutes`);
      expect(persistence).toContain(`${prayer}_prayer_duration_minutes`);
      expect(feed).toContain(`displaySettings.${prayer}PrayerDurationMinutes`);
    }

    for (const source of [admin, action, persistence, feed]) {
      expect(source).toContain("azkarPlaylistIds");
    }
    expect(tv).toContain("feed.displaySettings.prayerDurations[prayer]");
  });

  it("wires the operator-configured Prayerapp public URL into the Feed QR source", () => {
    const admin = read("app/admin/settings/page.tsx");
    const action = read("app/admin/settings/actions.ts");
    const persistence = read("lib/data/mosque-settings.ts");
    const feed = read("lib/masjid-display/build-feed.ts");
    const qr = read("masjid-display/components/PersistentAppQr.tsx");

    expect(admin).toContain("publicAppUrl");
    expect(action).toContain("public_app_url");
    expect(persistence).toContain("public_app_url");
    expect(feed).toContain("publicAppUrl: requirePublicAppUrl(mosqueSettings.publicAppUrl)");
    expect(qr).toMatch(/publicAppUrl|url/);
  });

  it("keeps existing content controls database/Admin driven and campaign QR data in Feed v1", () => {
    for (const path of [
      "app/admin/announcements/actions.ts",
      "app/admin/events/actions.ts",
      "app/admin/donations/actions.ts",
      "app/admin/jumuah/actions.ts",
    ]) {
      expect(read(path)).toMatch(/beginAdminAudit|requireAllowedAdminIdentity/);
    }
    const feed = read("lib/masjid-display/build-feed.ts");
    expect(feed).toContain("donationUrl: item.donationUrl || null");
    expect(feed).toContain("additionalJumuah");
    expect(feed).toContain("projectedAnnouncements");
    expect(feed).toContain("projectedEvents");
    expect(feed).toContain("projectedCampaigns");
  });

  it("does not restore legacy absolute-Iqama fields as an active authority", () => {
    const feed = read("lib/masjid-display/build-feed.ts");
    const tv = read("masjid-display/lib/state/prayer-state.ts");
    const joined = `${feed}\n${tv}`;
    for (const prayer of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) {
      const camelLegacy = new RegExp(`\\b${prayer}${"Iqama"}\\b`, "u");
      const snakeLegacy = new RegExp(`\\b${prayer}${"_iqama"}\\b`, "u");
      expect(joined).not.toMatch(camelLegacy);
      expect(joined).not.toMatch(snakeLegacy);
    }
  });
});
