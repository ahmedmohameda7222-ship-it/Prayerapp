import { existsSync, readFileSync } from "node:fs";
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

  it("has a migration-only bootstrap authority and forward-only Phase 1 privilege repair", () => {
    expect(existsSync(path.join(process.cwd(), "supabase/schema.sql"))).toBe(false);
    const initial = source("supabase/migrations/20260626000000_initial_schema.sql");
    const originalPhase1 = source("supabase/migrations/20260812000000_phase_1_account_personalization.sql");
    const correction = source("supabase/migrations/20260812010000_phase_1_post_merge_correction.sql");
    expect(initial).toMatch(/create table if not exists\s+(?:public\.)?prayer_times/i);
    expect(originalPhase1).toContain("public.user_saved_azkar");
    expect(originalPhase1).toContain("public.user_prayer_reminders");
    expect(originalPhase1).toContain("auth.uid() = user_id");
    expect(originalPhase1).toContain("prayer in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')");
    expect(originalPhase1).toContain("drop column if exists prayer_reminder_minutes");
    expect(correction).toContain("revoke all on public.user_saved_azkar, public.user_prayer_reminders from anon");
    expect(correction).toContain("grant select on public.user_prayer_reminders to service_role");
    expect(correction).not.toContain("grant all");
  });

  it("aligns repository Auth policy with eight-character passwords and email confirmation", () => {
    const config = source("supabase/config.toml");
    expect(config).toContain("minimum_password_length = 8");
    expect(config).toMatch(/\[auth\.email\][\s\S]*enable_confirmations = true/);
  });

  it("derives push account association from a verified bearer session", () => {
    const route = source("app/api/push/subscriptions/route.ts");
    expect(route).toContain("client.auth.getUser(token)");
    expect(route).toContain("user_id: verifiedUserId");
    expect(route).not.toMatch(/body\??\.user_?id/i);
    expect(route).not.toContain("reminderMinutes");
  });

  it("waits for auth initialization before deciding whether a push device is guest or account-associated", () => {
    const provider = source("components/providers/AppPreferencesProvider.tsx");
    expect(provider).toContain("loading: authLoading");
    expect(provider).toContain("if (authLoading) return;");
    expect(provider).toContain("[authLoading, saveStored, syncSubscription]");
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
    expect(account).toContain("catch (detachError)");
    expect(account).toContain("client.auth.signOut()");
    expect(account.indexOf("await detachAccount()")).toBeLessThan(account.indexOf("client.auth.signOut()"));
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

  it("keeps Home in one source order at every breakpoint", () => {
    const home = source("components/home/HomePageClient.tsx");
    const css = source("app/globals.css");
    const page = source("app/page.tsx");
    const expectedSections = ["hero", "urgent", "prayer-times", "contextual-action", "events", "donations"];
    let cursor = -1;
    for (const section of expectedSections) {
      const next = home.indexOf(`data-home-section=\"${section}\"`);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
    expect(home).not.toContain("QuickActionCard");
    expect(home).toContain("<HomeEventsList events={events} />");
    expect(home).toContain('showUrl={false}');
    expect(css).not.toContain("grid-template-areas");
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

  it("uses the canonical message dictionaries for Phase 1 in all four locales and preserves Arabic RTL", () => {
    expect(existsSync(path.join(process.cwd(), "lib/i18n/phase1-copy.ts"))).toBe(false);
    for (const locale of ["ar", "en", "de", "tr"]) {
      const messages = JSON.parse(source(`messages/${locale}.json`)) as { phase1?: Record<string, unknown> };
      expect(messages.phase1?.account).toBeTruthy();
      expect(messages.phase1?.combinedIsha).toBeTruthy();
      expect(messages.phase1?.paypalSupport).toBeTruthy();
      expect(messages.phase1?.smartLabels).toBeTruthy();
    }
    expect(getTextDirection("ar")).toBe("rtl");
    expect(getTextDirection("en")).toBe("ltr");
  });
});
