import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Phase 1 account and personalization contracts", () => {
  it("accepts only local post-auth return paths", () => {
    const signIn = source("app/account/sign-in/page.tsx");
    expect(signIn).toContain("normalizeReturnPath");
    expect(signIn).not.toContain("window.location.href = next");
  });

  it("keeps public user auth separate from admin allowlist auth", () => {
    expect(source("lib/auth/use-admin-auth.ts")).toContain("verifyAdminAction");
    expect(source("components/providers/AuthProvider.tsx")).not.toContain("verifyAdminAction");
  });

  it("has a migration-only bootstrap authority and forward-only reminder preference migrations", () => {
    expect(source("supabase/migrations/20260825200000_user_preferences.sql")).toContain("create table if not exists public.user_preferences");
    expect(source("supabase/migrations/20260825201000_user_prayer_reminders.sql")).toContain("create table if not exists public.user_prayer_reminders");
  });

  it("aligns repository Auth policy with eight-character passwords and email confirmation", () => {
    expect(source("supabase/config.toml")).toContain("minimum_password_length = 8");
    expect(source("supabase/config.toml")).toContain("enable_confirmations = true");
  });

  it("derives push account association from a verified bearer session", () => {
    const route = source("app/api/push/register/route.ts");
    expect(route).toContain("getUser(token)");
    expect(route).not.toContain("userId: body");
  });

  it("waits for auth initialization before deciding whether a push device is guest or account-associated", () => {
    const preferences = source("components/providers/AppPreferencesProvider.tsx");
    expect(preferences).toContain("authLoading");
    expect(preferences).toContain("if (authLoading) return");
  });

  it("targets only the five canonical prayers with optional pre-Adhan and mandatory Adhan notifications", () => {
    const scheduler = source("supabase/functions/schedule-prayer-notifications/index.ts");
    expect(scheduler).toContain('const prayerNames = ["fajr", "dhuhr", "asr", "maghrib", "isha"]');
    expect(scheduler).toContain("pre_adhan");
    expect(scheduler).toContain("adhan");
  });

  it("detaches an active push device on sign-out and deletes account-associated devices on account deletion", () => {
    const preferences = source("components/providers/AppPreferencesProvider.tsx");
    expect(preferences).toContain("detachPushDevice");
    const deleteRoute = source("app/api/account/delete/route.ts");
    expect(deleteRoute).toContain("push_devices");
  });

  it("keeps Saved Azkar account-backed while daily progress stays local", () => {
    const azkar = source("components/azkar/AzkarRoutine.tsx");
    expect(azkar).toContain("saved_azkar");
    expect(azkar).toContain("localStorage");
  });

  it("keeps Home in one source order at every breakpoint", () => {
    const home = source("components/home/HomePageClient.tsx");
    expect(home).toContain('data-home-section="hero"');
    expect(home).toContain('data-home-section="prayer-times"');
    expect(home).toContain('data-home-section="events"');
    expect(home).toContain('data-home-section="donations"');
  });

  it("shows full urgent copy with an honest news link", () => {
    const card = source("components/news/AnnouncementCard.tsx");
    expect(card).toContain("announcement.message");
    expect(card).toContain('href="/news"');
  });

  it("provides five prayer reminder controls, aligned timing columns, outside-dismiss behavior, per-prayer Adhan choices, and excludes Sunrise", () => {
    const card = source("components/prayer/HomePrayerTimesCard.tsx");
    expect(card).toContain("reminderPrayers");
    expect(card).toContain("pointerdown");
    expect(card).toContain("getAdhanSoundsForPrayer");
    expect(card).toContain('name !== "sunrise"');
  });

  it("keeps the Maghrib lesson and combined Isha program in the Home prayer board", () => {
    const card = source("components/prayer/HomePrayerTimesCard.tsx");
    expect(card).toContain("maghribProgram.lessonTitle");
    expect(card).toContain("maghribProgram.combinedIshaTime");
  });

  it("keeps public legal routes while hiding Imprint from More", () => {
    expect(existsSync(path.join(process.cwd(), "app/privacy/page.tsx"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "app/imprint/page.tsx"))).toBe(true);
    expect(source("app/more/page.tsx")).toContain('"/privacy"');
    expect(source("app/more/page.tsx")).not.toContain('"/imprint"');
    expect(source("app/account/page.tsx")).toContain('"/privacy"');
    expect(source("app/account/page.tsx")).toContain('"/imprint"');
  });

  it("retires the old global timing selector and fake countdown placeholder", () => {
    const settings = source("components/settings/SettingsControls.tsx");
    const countdown = source("components/prayer/PrayerCountdown.tsx");
    expect(settings).not.toContain("prayerReminderMinutes");
    expect(settings).not.toContain('id="prayer-reminder"');
    expect(countdown).not.toContain("01:24:36");
    expect(countdown).not.toContain('name: "asr"');
    expect(countdown).toContain("stateFor(effectiveSchedule, iqamaByDate, new Date(initialNow))");
  });

  it("keeps PayPal URLs hidden on Home and exposes explicit bank-copy feedback", () => {
    expect(source("components/home/HomePageClient.tsx")).toContain('showUrl={false}');
    expect(source("components/donations/PayPalCard.tsx")).toContain("showUrl ?");
    expect(source("components/donations/BankTransferCard.tsx")).toContain('role="status"');
  });

  it("uses the canonical message dictionaries for Phase 1 in all four locales and preserves Arabic RTL", () => {
    const messages = source("lib/i18n/messages.ts");
    expect(messages).toContain("ar:");
    expect(messages).toContain("en:");
    expect(messages).toContain("de:");
    expect(messages).toContain("tr:");
    expect(source("lib/i18n/context.tsx")).toContain('dir={locale === "ar" ? "rtl" : "ltr"}');
  });
});
