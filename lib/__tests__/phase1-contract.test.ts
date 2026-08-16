import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Phase 1 account and personalization contracts", () => {
  it("has a public auth provider and account shell routes", () => {
    const layout = source("app/layout.tsx");
    expect(layout).toContain("AuthProvider");
    expect(existsSync(path.join(process.cwd(), "app/account/page.tsx"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "app/account/sign-in/page.tsx"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "app/account/register/page.tsx"))).toBe(true);
  });

  it("keeps account auth isolated from admin auth", () => {
    const publicAuth = source("components/providers/AuthProvider.tsx");
    const adminAuth = source("lib/supabase/auth.ts");
    expect(publicAuth).toContain("getUser()");
    expect(adminAuth).toContain("requireAdmin");
    expect(publicAuth).not.toContain("ADMIN_EMAILS");
  });

  it("keeps locale and time format providers available globally", () => {
    const layout = source("app/layout.tsx");
    expect(layout).toContain("I18nProvider");
    expect(layout).toContain("TimeFormatProvider");
  });

  it("stores per-user favorites and prayer reminders in Supabase", () => {
    const migration = source("supabase/migrations/20260812000000_phase_1_account_personalization.sql");
    expect(migration).toContain("create table if not exists public.user_azkar_favorites");
    expect(migration).toContain("create table if not exists public.user_prayer_reminders");
    expect(migration).toContain("auth.uid() = user_id");
  });

  it("gives public authenticated users explicit Data API table privileges", () => {
    const correction = source("supabase/migrations/20260812010000_phase_1_post_merge_correction.sql");
    expect(correction).toContain("grant select, insert, delete on table public.user_azkar_favorites to authenticated");
    expect(correction).toContain("grant select, insert, update, delete on table public.user_prayer_reminders to authenticated");
  });

  it("keeps locale-first translation helpers in the public app", () => {
    const i18n = source("lib/i18n/use-translation.ts");
    expect(i18n).toContain("useI18n");
    expect(i18n).toContain("locale");
  });

  it("keeps prayer time formatting centralized", () => {
    const formatter = source("lib/time-format.ts");
    expect(formatter).toContain("formatTime");
    expect(formatter).toContain('format === "12-hour"');
  });

  it("keeps favorite state account-backed instead of local-only", () => {
    const routine = source("components/azkar/AzkarRoutine.tsx");
    expect(routine).toContain('from("user_azkar_favorites")');
    expect(routine).toContain("user_id: user.id");
  });

  it("keeps Home as the primary public dashboard", () => {
    const home = source("app/page.tsx");
    const css = source("app/globals.css");
    const page = source("components/home/HomeEventsList.tsx");
    expect(home).not.toContain("QuickActionCard");
    expect(home).toContain("<HomeEventsList events={events} />");
    expect(home).toContain('showUrl={false}');
    expect(css).not.toContain("grid-template-areas");
    expect(page).toContain('`${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)');
  });

  it("shows full urgent copy with an honest news link", () => {
    const announcement = source("components/news/AnnouncementCard.tsx");
    expect(announcement).toContain("if (home)");
    expect(announcement).toContain('<Link href="/news"');
    expect(announcement).toContain('whitespace-pre-wrap text-sm leading-6 text-[var(--home-text-secondary)]');
    expect(announcement).toContain('className="line-clamp-2 whitespace-pre-wrap');
  });

  it("provides five prayer reminder controls, timing choices, per-prayer Adhan choices, and excludes Sunrise", () => {
    const table = source("components/prayer/HomePrayerTimesCard.tsx");
    expect(table).toContain('new Set<ReminderPrayer>(["fajr", "dhuhr", "asr", "maghrib", "isha"])');
    expect(table).toContain('const canRemind = name !== "sunrise"');
    expect(table).toContain('aria-pressed={isEnabled}');
    expect(table).toContain('/account/sign-in?next=');
    expect(table).toContain("reminderOptions");
    expect(table).toContain("lead_minutes: normalizedLeadMinutes");
    expect(table).toContain("adhan_sound_id: adhanSoundId");
    expect(table).toContain("getAdhanSoundsForPrayer(editingPrayer)");
    expect(table).toContain('data-testid="prayer-reminder-dialog"');
    expect(table).not.toContain("Settings2");
  });

  it("keeps the Maghrib lesson and combined Isha program in the Home prayer board", () => {
    const table = source("components/prayer/HomePrayerTimesCard.tsx");
    expect(table).toContain('data-testid="maghrib-program"');
    expect(table).toContain("maghribProgram.lessonTitle");
    expect(table).toContain("maghribProgram.combinedIshaTime");
    expect(table).toContain("copy.maghribProgram");
  });

  it("removes the Privacy page and public navigation entries", () => {
    expect(existsSync(path.join(process.cwd(), "app/privacy/page.tsx"))).toBe(false);
    expect(source("app/more/page.tsx")).not.toContain('"/privacy"');
    expect(source("app/account/page.tsx")).not.toContain('"/privacy"');
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

  it("keeps saved Azkar favorites available through the Favorites tab", () => {
    const routine = source("components/azkar/AzkarRoutine.tsx");
    expect(routine).toContain('selectedCategory === "Favorites"');
    expect(routine).toContain("favoriteIds.has(item.id)");
  });

  it("keeps the account page connected to reminder and saved Azkar management", () => {
    const account = source("app/account/page.tsx");
    expect(account).toContain('"/azkar?tab=Favorites"');
    expect(account).toContain('"/#prayer-times"');
  });

  it("supports the four required public locales", () => {
    const locale = source("lib/i18n/types.ts");
    expect(locale).toContain('"ar"');
    expect(locale).toContain('"en"');
    expect(locale).toContain('"de"');
    expect(locale).toContain('"tr"');
  });
});
