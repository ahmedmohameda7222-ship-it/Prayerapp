import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public design system contract", () => {
  it("defines one semantic public typography, weight, radius, spacing, and color vocabulary", () => {
    const globals = source("app/globals.css");

    expect(globals).toContain("--ui-text-meta: 0.75rem;");
    expect(globals).toContain("--ui-text-secondary: 0.875rem;");
    expect(globals).toContain("--ui-text-body: 1rem;");
    expect(globals).toContain("--ui-text-card-title: 1.0625rem;");
    expect(globals).toContain("--ui-text-section-title: 1.25rem;");
    expect(globals).toContain("--ui-text-page-title: 1.5rem;");
    expect(globals).toContain("--ui-text-prominent: 2rem;");

    expect(globals).toContain("--ui-weight-regular: 400;");
    expect(globals).toContain("--ui-weight-medium: 500;");
    expect(globals).toContain("--ui-weight-semibold: 600;");
    expect(globals).toContain("--ui-weight-bold: 700;");

    expect(globals).toContain("--ui-radius-control: 0.875rem;");
    expect(globals).toContain("--ui-radius-card: 1.125rem;");
    expect(globals).toContain("--ui-radius-large: 1.5rem;");
    expect(globals).toContain("--ui-radius-pill: 999px;");

    expect(globals).toContain("--ui-space-1: 0.25rem;");
    expect(globals).toContain("--ui-space-2: 0.5rem;");
    expect(globals).toContain("--ui-space-3: 0.75rem;");
    expect(globals).toContain("--ui-space-4: 1rem;");
    expect(globals).toContain("--ui-space-6: 1.5rem;");
    expect(globals).toContain("--ui-space-8: 2rem;");

    expect(globals).toContain("--ui-canvas: #f3efe7;");
    expect(globals).toContain("--ui-surface: #fcfaf6;");
    expect(globals).toContain("--ui-surface-subtle: #f7f2ea;");
    expect(globals).toContain("--ui-text: #20231f;");
    expect(globals).toContain("--ui-text-secondary-color: #696860;");
    expect(globals).toContain("--ui-divider: #d6cdbf;");
    expect(globals).toContain("--ui-brand: #245847;");
    expect(globals).toContain("--ui-brand-strong: #173f34;");
    expect(globals).toContain("--ui-brand-soft: #f1f0ec;");
    expect(globals).toContain("--ui-urgent: #a3463d;");
    expect(globals).toContain("--ui-urgent-soft: #f7e9e6;");
    expect(globals).toContain("--ui-success: #3a755e;");
    expect(globals).toContain("--ui-disabled: #85827a;");
    expect(globals).toContain("--ui-focus: #245847;");
    expect(globals).toContain("--ui-brass: #8d642d;");
    expect(globals).toContain("--ui-brass-soft: #f0e3cd;");
  });

  it("aliases Home and non-Home public palettes to the semantic vocabulary", () => {
    const globals = source("app/globals.css");
    const publicUi = source("app/public-ui-refresh.css");

    expect(globals).toContain("--home-brand: var(--ui-brand);");
    expect(globals).toContain("--home-brand-strong: var(--ui-brand-strong);");
    expect(globals).toContain("--home-canvas: var(--ui-canvas);");
    expect(globals).toContain("--home-surface: var(--ui-surface);");
    expect(globals).toContain("--home-text: var(--ui-text);");
    expect(globals).toContain("--home-text-secondary: var(--ui-text-secondary-color);");
    expect(globals).toContain("--home-divider: var(--ui-divider);");

    expect(publicUi).toContain("--app-canvas: var(--ui-canvas);");
    expect(publicUi).toContain("--app-surface: var(--ui-surface);");
    expect(publicUi).toContain("--app-divider: var(--ui-divider);");
    expect(publicUi).toContain("--app-text: var(--ui-text);");
    expect(publicUi).toContain("--app-text-secondary: var(--ui-text-secondary-color);");
    expect(publicUi).toContain("--app-brand: var(--ui-brand);");
    expect(publicUi).toContain("--app-brand-strong: var(--ui-brand-strong);");
    expect(publicUi).toContain("--app-brand-soft: var(--ui-brand-soft);");
    expect(publicUi).toContain("--app-danger: var(--ui-urgent);");
    expect(publicUi).toContain("--app-danger-soft: var(--ui-urgent-soft);");
  });

  it("keeps the shared Button primitive on semantic palette and radius tokens", () => {
    const button = source("components/ui/Button.tsx");

    expect(button).not.toContain("#f3d98b");
    expect(button).toContain("var(--ui-brand)");
    expect(button).toContain("var(--ui-surface)");
    expect(button).toContain("var(--ui-brass)");
    expect(button).toContain("var(--ui-brass-soft)");
    expect(button).toContain("rounded-[var(--ui-radius-control)]");
  });

  it("uses full subtle status borders instead of 3px one-sided stripes", () => {
    const home = source("app/responsive-prayer-nav.css");
    const friday = source("app/friday-page.css");
    const publicUi = source("app/public-ui-refresh.css");
    const publicStatusCss = `${home}\n${friday}\n${publicUi}`;

    expect(publicStatusCss).not.toMatch(/border-inline-start:\s*3px/);
    expect(home).toContain("border: 1px solid var(--home-divider);");
    expect(home).toContain("background: var(--home-urgent-soft);");
    expect(friday).toContain("border: 1px solid var(--home-divider);");
    expect(publicUi).toContain("background: var(--app-danger-soft);");
  });
});
