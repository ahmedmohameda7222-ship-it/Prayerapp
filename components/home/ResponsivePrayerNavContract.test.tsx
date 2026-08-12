import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Responsive Prayerapp navigation and Next Prayer contract", () => {
  it("uses the mosque image as the uncropped mobile Next Prayer background", () => {
    const css = source("app/responsive-prayer-nav.css");
    const prayer = source("components/prayer/PrayerCountdown.tsx");

    expect(css).toContain("@media (max-width: 1023px)");
    expect(css).toContain("aspect-ratio: 4 / 3");
    expect(css).toContain("object-fit: contain");
    expect(css).toContain(".home-next-prayer-content");
    expect(prayer).toContain("home-next-prayer-label");
    expect(prayer).toContain("font-extrabold");
  });

  it("keeps mobile navigation glassy and makes desktop navigation a collapsible physical left sidebar", () => {
    const css = source("app/responsive-prayer-nav.css");
    const nav = source("components/layout/BottomNav.tsx");

    expect(css).toContain("backdrop-filter: blur(24px) saturate(1.18)");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain("padding: 0 40px 64px 304px");
    expect(css).toContain("padding-left: 104px");
    expect(css).toContain("width: 272px");
    expect(css).toContain("width: 80px");
    expect(css).toContain(".home-page-shell .home-app-header");
    expect(css).toContain("margin-inline: 0");
    expect(css).toContain("data-desktop-sidebar");
    expect(nav).toContain("desktop-sidebar-toggle");
    expect(nav).toContain("PanelLeftClose");
    expect(nav).toContain("PanelLeftOpen");
    expect(nav).toContain("document.documentElement.dataset.desktopSidebar");
    expect(nav).toContain("--nav-sidebar-index");
    expect(css).toContain("var(--nav-sidebar-index, 0)");
  });

  it("keeps major Home content visibly grouped into section cards with distinct section headers", () => {
    const home = source("components/home/HomePageClient.tsx");
    const title = source("components/home/HomeSectionTitle.tsx");
    const css = source("app/responsive-prayer-nav.css");

    expect(home).toContain("home-section-urgent home-section-card");
    expect(home).toContain("home-section-events home-section-card");
    expect(home).toContain("home-section-donations home-section-card");
    expect(home).toContain("home-section-card-header");
    expect(title).toContain("home-section-title");
    expect(css).toContain("--home-section-header: #e2ece7");
    expect(css).toContain("--home-section-header-soft: #edf3f0");
    expect(css).toContain("--home-section-header-text: #173d37");
    expect(css).toContain(".home-section-card-header");
    expect(css).toContain(".home-section-empty-message");
    expect(home).toContain("لا توجد فعاليات قادمة في المسجد حاليًا.");
    expect(home).toContain("لا توجد حملات تبرع نشطة حاليًا.");
  });

  it("uses one donation verse with a separate exact reference and a deliberate typography hierarchy", () => {
    const home = source("components/home/HomePageClient.tsx");
    const css = source("app/responsive-prayer-nav.css");

    expect(home).toContain("لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ");
    expect(home).toContain("آل عمران: 92");
    expect(home).not.toContain('t("phase1.donationReflectionVerse")');
    expect(home).toContain("home-donation-reference");
    expect(home).toContain("home-donation-reflection-copy");
    expect(css).toContain("font-size: 44px");
    expect(css).toContain("font-size: 30px");
    expect(css).toContain("font-size: 28px");
    expect(css).toContain("font-size: 24px");
    expect(css).toContain("font-size: 20px");
  });
});
