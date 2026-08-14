import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Home UI V2 visual contract", () => {
  it("uses the explicit prayer instrument with the real mosque visual", () => {
    const home = source("components/home/HomePageClient.tsx");
    const nextPrayer = source("components/home/HomeNextPrayerSurface.tsx");
    expect(home).not.toContain("HeroCard");
    expect(home).toContain('variant="instrument"');
    expect(home).toContain("HomeNextPrayerSurface");
    expect(nextPrayer).toContain("home-next-prayer-surface");
    expect(nextPrayer).toContain("/assets/hero-home-mosque-night.png");
    expect(nextPrayer).toContain("/assets/hero-home-mosque-night-desktop.png");
    expect(home).toContain("home-urgent-surface");
    expect(home).toContain("home-section-prayer");
    expect(home).toContain("home-section-contextual");
    expect(home).toContain("home-section-events");
    expect(home).toContain("home-section-donations");
    expect(home).not.toMatch(/color-gold|#fff9e8|rounded-\[24px\]|font-brand/);
  });

  it("keeps the Home identity header free of decorative AI treatment", () => {
    const header = source("components/layout/HomeIdentityHeader.tsx");
    expect(header).not.toMatch(/font-brand|color-gold|rounded-b|shadow|backdrop-blur|bg-gradient/);
    expect(header).toContain("home-app-header-chrome");
    expect(header).toContain("home-quran-text");
  });

  it("keeps Home titles restrained and the timetable unified", () => {
    const title = source("components/home/HomeSectionTitle.tsx");
    const timetable = source("components/prayer/HomePrayerTimesCard.tsx");
    expect(title).not.toMatch(/uppercase|tracking|gold|drop-shadow/);
    expect(timetable).not.toMatch(/rounded-\[24px\]|color-cream|shadow-\[var\(--shadow/);
    expect(timetable).toContain("home-prayer-board");
    expect(timetable).toContain('data-testid="home-prayer-board"');
    expect(timetable).toContain("aria-pressed");
    expect(timetable).toContain("maghrib-program");
  });

  it("uses a warm Home canvas without returning to decorative gold", () => {
    const css = source("app/globals.css");
    expect(css).toContain("--home-canvas: #f7f3ea");
    expect(css).toContain("--home-surface: #fffdf8");
    expect(css).toContain("--home-divider: #e5ded2");
    expect(css).toContain("--home-text: #171a18");
  });

  it("uses one floating shared navigation selection with reduced-motion support", () => {
    const nav = source("components/layout/BottomNav.tsx");
    const css = source("app/globals.css");
    expect(nav).not.toMatch(/gradient|rounded-t/);
    expect(nav).toContain("bottom-nav-selection");
    expect(nav).toContain("--nav-active-index");
    expect(css).toContain(".bottom-nav-selection");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).not.toMatch(/\.bottom-nav-selection[\s\S]*?gold/);
  });

  it("keeps content layers free of forbidden AI-generic treatments", () => {
    const contentSources = [
      source("components/home/HomePageClient.tsx"),
      source("components/home/HomeNextPrayerSurface.tsx"),
      source("components/layout/HomeIdentityHeader.tsx"),
      source("components/home/SmartNextActionCard.tsx"),
    ].join("\n");
    expect(contentSources).not.toMatch(/var\(--color-gold|font-brand|bg-gradient|backdrop-blur|HeroCard|hero-overlay/);
  });
});
