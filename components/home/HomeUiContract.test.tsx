import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("canonical Home UI authority", () => {
  it("loads home-ui.css in the existing Home layer position and retires preview terminology", () => {
    const layout = source("app/layout.tsx");

    expect(layout).toContain('import "./responsive-prayer-nav.css";\nimport "./home-ui.css";');
    expect(layout).not.toContain("home-palette-preview.css");
    expect(existsSync(join(process.cwd(), "app/home-ui.css"))).toBe(true);
    expect(existsSync(join(process.cwd(), "app/home-palette-preview.css"))).toBe(false);
  });

  it("keeps canonical Home color roles in globals instead of a second hard-coded palette", () => {
    const globals = source("app/globals.css");

    expect(globals).toContain("--ui-section-header: #eceae5;");
    expect(globals).toContain("--ui-section-header-soft: var(--ui-surface);");
    expect(globals).toContain("--ui-section-header-text: var(--ui-brand-strong);");
    expect(globals).toContain("--home-section-header: var(--ui-section-header);");
    expect(globals).toContain("--home-section-header-soft: var(--ui-section-header-soft);");
    expect(globals).toContain("--home-section-header-text: var(--ui-section-header-text);");
  });

  it("keeps Home selectors in home-ui.css without redefining the canonical palette", () => {
    const css = source("app/home-ui.css");

    expect(css).toContain(".home-page-shell .home-app-header-chrome");
    expect(css).toContain("background: var(--home-brand-strong);");
    expect(css).toContain(".home-page-shell .home-paypal-surface a");
    expect(css).toContain("background: var(--home-brand-strong);");
    expect(css).toContain("color: var(--home-surface) !important;");
    expect(css).not.toMatch(/--home-(?:brand|canvas|surface|text|divider|urgent|success|disabled|focus|brass):\s*#/);
  });

  it("does not let responsive Home CSS override canonical section color aliases", () => {
    const responsive = source("app/responsive-prayer-nav.css");

    expect(responsive).not.toMatch(/--home-section-header(?:-soft|-text)?:\s*#/);
  });
});
