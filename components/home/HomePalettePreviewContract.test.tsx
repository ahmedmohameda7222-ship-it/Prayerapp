import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Home calm palette preview contract", () => {
  it("loads a Home-only palette layer after the existing global styles", () => {
    const layout = source("app/layout.tsx");
    const css = source("app/home-palette-preview.css");

    expect(layout).toContain('import "./responsive-prayer-nav.css";\nimport "./home-palette-preview.css";');
    expect(css).toContain(".home-page-shell {");
    expect(css).toContain("--home-canvas: #f3efe7");
    expect(css).toContain("--home-surface: #fcfaf6");
    expect(css).toContain("--home-surface-subtle: #f7f2ea");
    expect(css).toContain("--home-section-header: #eceae5");
    expect(css).toContain("--home-section-header-soft: #fcfaf6");
    expect(css).toContain("--home-divider: #d6cdbf");
    expect(css).toContain("--home-text: #20231f");
    expect(css).toContain("--home-text-secondary: #696860");
    expect(css).toContain("--home-brand: #245847");
    expect(css).toContain("--home-brand-strong: #173f34");
    expect(css).toContain("--home-brand-soft: #f1f0ec");
    expect(css).toContain("--home-urgent: #a3463d");
    expect(css).toContain("--home-success: #3a755e");
  });

  it("does not reintroduce rejected mint, light-blue, or caramel section bands", () => {
    const css = source("app/home-palette-preview.css");

    expect(css).not.toMatch(/#e2ece7|#edf3f0|#e8f1ef|#ded2c0|#eae0d2|#e3d7c7|lightblue|light-blue|mint/i);
  });

  it("keeps prayer column labels on the card surface and bold instead of using a tinted table band", () => {
    const css = source("app/home-palette-preview.css");

    expect(css).toContain(".home-page-shell .home-prayer-board > div:nth-child(2)");
    expect(css).toContain("background: var(--home-surface)");
    expect(css).toContain("font-weight: 800");
  });

  it("makes the desktop Home header flush with the physical sidebar and right viewport edge", () => {
    const css = source("app/home-palette-preview.css");

    expect(css).toContain("margin-left: -32px");
    expect(css).toContain("margin-right: -40px");
    expect(css).toContain('html[data-desktop-sidebar="collapsed"] .home-page-shell .home-app-header');
    expect(css).toContain("margin-left: -24px");
  });

  it("keeps mobile navigation glassy with a neutral selected surface", () => {
    const css = source("app/home-palette-preview.css");

    expect(css).toContain("background: rgba(252, 250, 246, 0.74)");
    expect(css).toContain("background: rgba(241, 240, 236, 0.84)");
    expect(css).toContain(".home-page-shell .bottom-nav-link-active");
  });

  it("gives the Arabic mosque name a large responsive title hierarchy", () => {
    const css = source("app/home-palette-preview.css");

    expect(css).toContain(".home-page-shell .home-app-header-chrome h1");
    expect(css).toContain('h1[lang="ar"]');
    expect(css).toContain("font-size: 40px");
    expect(css).toContain("font-size: 48px");
    expect(css).toContain("font-weight: 800");
  });

  it("uses a deep-forest Home PayPal CTA with high-contrast light text", () => {
    const paypal = source("components/donations/PayPalCard.tsx");

    expect(paypal).toContain("bg-[var(--home-brand-strong)]");
    expect(paypal).toContain("text-[#FCFAF6]");
    expect(paypal).toContain("hover:bg-[var(--home-brand)]");
  });
});
