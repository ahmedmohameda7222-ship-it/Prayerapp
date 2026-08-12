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

  it("keeps mobile navigation glassy and moves desktop navigation to the physical left", () => {
    const css = source("app/responsive-prayer-nav.css");
    const nav = source("components/layout/BottomNav.tsx");

    expect(css).toContain("backdrop-filter: blur(24px) saturate(1.18)");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain("left: 0");
    expect(css).toContain("width: 124px");
    expect(nav).toContain("--nav-sidebar-index");
    expect(css).toContain("var(--nav-sidebar-index, 0)");
  });
});
