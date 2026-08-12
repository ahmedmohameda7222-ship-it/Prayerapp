import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Home UI V2 visual contract", () => {
  it("uses the flat prayer instrument and Home-only section primitives", () => {
    const home = source("components/home/HomePageClient.tsx");
    expect(home).not.toContain("HeroCard");
    expect(home).toContain('variant="instrument"');
    expect(home).toContain("HomeSectionTitle");
    expect(home).toContain("HomeEmptyState");
    expect(home).not.toMatch(/color-gold|#fff9e8|rounded-\[24px\]|font-brand/);
  });

  it("keeps the Home header free of the former floating decorative treatment", () => {
    const header = source("components/layout/AppHeader.tsx");
    expect(header).not.toMatch(/font-brand|color-gold|color-cream|rounded-b|shadow|backdrop-blur/);
    expect(header).toContain("home-app-header-chrome");
    expect(header).toContain("home-quran-text");
  });

  it("keeps Home titles and the timetable flat", () => {
    const title = source("components/home/HomeSectionTitle.tsx");
    const timetable = source("components/prayer/HomePrayerTimesCard.tsx");
    expect(title).not.toMatch(/uppercase|tracking|gold|drop-shadow/);
    expect(timetable).not.toMatch(/rounded-\[24px\]|color-cream|shadow-\[var\(--shadow/);
    expect(timetable).toContain("aria-pressed");
    expect(timetable).toContain("maghrib-program");
  });

  it("keeps BottomNav flat without a gradient shell or active card", () => {
    const nav = source("components/layout/BottomNav.tsx");
    const css = source("app/globals.css");
    const active = css.match(/\.bottom-nav-link-active\s*\{[\s\S]*?\}/)?.[0] || "";
    expect(nav).not.toMatch(/gradient|rounded-t|shadow/);
    expect(active).not.toMatch(/background|border|radius|shadow|gradient|gold/);
  });
});
