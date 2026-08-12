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
    expect(css).toContain("--home-section-header: #e8dfd1");
    expect(css).toContain("--home-section-header-soft: #f0e8dc");
    expect(css).toContain("--home-divider: #d6cdbf");
    expect(css).toContain("--home-text: #20231f");
    expect(css).toContain("--home-text-secondary: #696860");
    expect(css).toContain("--home-brand: #245847");
    expect(css).toContain("--home-brand-strong: #173f34");
    expect(css).toContain("--home-brand-soft: #e9e0d3");
    expect(css).toContain("--home-urgent: #a3463d");
    expect(css).toContain("--home-success: #3a755e");
  });

  it("does not reintroduce the rejected mint or light-blue Home surfaces", () => {
    const css = source("app/home-palette-preview.css");

    expect(css).not.toMatch(/#e2ece7|#edf3f0|#e8f1ef|lightblue|light-blue|mint/i);
  });

  it("makes the desktop Home header flush with the physical sidebar and right viewport edge", () => {
    const css = source("app/home-palette-preview.css");

    expect(css).toContain("margin-left: -32px");
    expect(css).toContain("margin-right: -40px");
    expect(css).toContain('html[data-desktop-sidebar="collapsed"] .home-page-shell .home-app-header');
    expect(css).toContain("margin-left: -24px");
  });

  it("keeps mobile navigation glassy while replacing mint selection with warm sand", () => {
    const css = source("app/home-palette-preview.css");

    expect(css).toContain("background: rgba(252, 250, 246, 0.74)");
    expect(css).toContain("background: rgba(233, 224, 211, 0.76)");
    expect(css).toContain(".home-page-shell .bottom-nav-link-active");
  });
});
