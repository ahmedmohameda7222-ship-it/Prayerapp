import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeReturnPath } from "@/lib/auth/return-url";
import { getTextDirection } from "@/lib/i18n/direction";

function source(file: string) {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("Phase 1 account and personalization contracts", () => {
  it("accepts only local post-auth return paths", () => {
    expect(normalizeReturnPath("/azkar?tab=Favorites#azkar-1")).toBe("/azkar?tab=Favorites#azkar-1");
    expect(normalizeReturnPath("//evil.example/steal")).toBe("/account");
    expect(normalizeReturnPath("https://evil.example/steal")).toBe("/account");
  });

  it("keeps public user auth separate from admin allowlist auth", () => {
    const publicAuth = source("components/providers/AuthProvider.tsx");
    const adminAuth = source("lib/auth/admin-server.ts");
    expect(publicAuth).not.toContain("ADMIN_EMAILS");
    expect(adminAuth).toContain("ADMIN_EMAILS");
  });

  it("creates own-row account tables and retires the legacy reminder timing column", () => {
    const migration = source("supabase/migrations/20260812000000_phase_1_account_personalization.sql");
    expect(migration).toContain("public.user_saved_azkar");
    expect(migration).toContain("public.user_prayer_reminders");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain("prayer in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')");
    expect(migration).not.toContain("prayer in ('fajr', 'sunrise'");
    expect(migration).toContain("add column if not exists user_id uuid references auth.users(id) on delete set null");
    expect(migration).toContain("drop column if exists prayer_reminder_minutes");
  });

  it("derives push account association from a verified bearer session", () => {
    const route = source("app/api/push/subscriptions/route.ts");
    expect(route).toContain("client.auth.getUser(token)");
    expect(route).toContain("user_id: verifiedUserId");
    expect(route).not.toMatch(/body\??\.user_?id/i);
    expect(route).not.toContain("reminderMinutes");
  });

  it("targets only the five canonical prayers at official adhan time with idempotent delivery keys", () => {
    const cron = source("app/api/cron/prayer-reminders/route.ts");
    expect(cron).toContain("user_prayer_reminders");
    expect(cron).toContain("fajr:");
    expect(cron).toContain("dhuhr:");
    expect(cron).toContain("asr:");
    expect(cron).toContain("maghrib:");
    expect(cron).toContain("isha:");
    expect(cron).not.toContain("sunrise:");
    expect(cron).not.toContain("prayer_reminder_minutes");
    expect(cron).toContain("`prayer:${schedule.date}:${prayer}:${time}`");
    expect(source("lib/push/web-push.ts")).toContain('reserveError?.code === "23505"');
  });

  it("detaches an active push device on sign-out and deletes account-associated devices on account deletion", () => {
    const provider = source("components/providers/AppPreferencesProvider.tsx");
    const account = source("app/account/page.tsx");
    const deletion = source("app/api/account/delete/route.ts");
    expect(provider).toContain("detachAccount");
    expect(provider).toContain("forceGuest");
    expect(account).toContain("await detachAccount()");
    expect(deletion).toContain('.from("push_subscriptions")');
    expect(deletion).toContain("client.auth.admin.deleteUser(userId)");
  });

  it("keeps Saved Azkar account-backed while daily progress stays local", () => {
    const hook = source("lib/hooks/use-saved-azkar.ts");
    const routine = source("components/azkar/AzkarRoutine.tsx");
    expect(hook).toContain('LEGACY_FAVORITES_KEY = "azkar_favorites_v1"');
    expect(hook).toContain('.from("user_saved_azkar")');
    expect(hook).toContain("validIds.has");
    expect(routine).toContain('PROGRESS_KEY = "azkar_progress_v1"');
    expect(routine).toContain("/account/sign-in?next=");
  });

  it("keeps Home focused and ordered around urgent content, prayer reminders, events, and donations", () => {
    const home = source("components/home/HomePageClient.tsx");
    const page = source("app/page.tsx");
    expect(home).not.toContain("QuickActionCard");
    expect(home).not.toContain("home.quickActions");
    expect(home).toContain("<AnnouncementCard key={announcement.id} announcement={announcement} home />");
    expect(home).toContain("<HomePrayerTimesCard");
    expect(home).toContain("<EventCard");
    expect(home).toContain("donationCampaigns.map");
    expect(home).toContain('showUrl={false}');
    expect(page).toContain('`${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)');
  });

  it("shows full urgent copy with an honest news link", () => {
    const announcement = source("components/news/AnnouncementCard.tsx");
    expect(announcement).toContain('home ? <Link href="/news"');
    expect(announcement).toContain('home ? "" : "line-clamp-2"');
  });

  it("provides five prayer reminder controls and excludes Sunrise", () => {
    const table = source("components/prayer/HomePrayerTimesCard.tsx");
    expect(table).toContain('new Set<ReminderPrayer>(["fajr", "dhuhr", "asr", "maghrib", "isha"])');
    expect(table).toContain('const canRemind = name !== "sunrise"');
    expect(table).toContain('aria-pressed={isEnabled}');
    expect(table).toContain('/account/sign-in?next=');
  });

  it("retires the old global timing selector and fake countdown placeholder", () => {
    const settings = source("components/settings/SettingsControls.tsx");
    const countdown = source("components/prayer/PrayerCountdown.tsx");
    expect(settings).not.toContain("prayerReminderMinutes");
    expect(settings).not.toContain('id="prayer-reminder"');
    expect(countdown).not.toContain("01:24:36");
    expect(countdown).not.toContain('name: "asr"');
    expect(countdown).toContain("stateFor(effectiveSchedule, new Date(initialNow))");
  });

  it("keeps PayPal URLs hidden on Home and exposes explicit bank-copy feedback", () => {
    expect(source("components/home/HomePageClient.tsx")).toContain('showUrl={false}');
    expect(source("components/donations/PayPalCard.tsx")).toContain("showUrl ?");
    expect(source("components/donations/BankTransferCard.tsx")).toContain('role="status"');
  });

  it("ships privacy copy in all four supported locales and preserves Arabic RTL", () => {
    const copy = source("lib/i18n/phase1-copy.ts");
    for (const locale of ["ar", "en", "de", "tr"]) expect(copy).toContain(`${locale}: {`);
    expect(getTextDirection("ar")).toBe("rtl");
    expect(getTextDirection("en")).toBe("ltr");
  });
});
