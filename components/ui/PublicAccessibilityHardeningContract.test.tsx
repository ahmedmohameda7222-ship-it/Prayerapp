import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public responsive, localization, and accessibility hardening", () => {
  it("lets narrow Home Next Prayer grow with enlarged text instead of clipping inside the image ratio", () => {
    const css = source("app/home-ui.css");
    const narrowStart = css.indexOf("@media (max-width: 420px)");

    expect(narrowStart).toBeGreaterThan(-1);
    const narrow = css.slice(narrowStart);
    expect(narrow).toMatch(/\.home-page-shell \.home-next-prayer-surface\s*\{[\s\S]*?aspect-ratio:\s*auto;/);
    expect(narrow).toMatch(/\.home-page-shell \.home-next-prayer-content\s*\{[\s\S]*?min-height:\s*20rem;/);
    expect(narrow).toMatch(/\.home-page-shell \.home-next-prayer-instrument\s*\{[\s\S]*?width:\s*100%;/);
  });

  it("lets the mobile donation verse wrap under enlarged text instead of forcing horizontal overflow", () => {
    const css = source("app/home-ui.css");
    const narrowStart = css.indexOf("@media (max-width: 420px)");

    expect(narrowStart).toBeGreaterThan(-1);
    const narrow = css.slice(narrowStart);
    expect(narrow).toMatch(/\.home-page-shell \.home-donation-verse\s*\{[\s\S]*?white-space:\s*normal;/);
  });

  it("allows the exact German legal association name to wrap safely under text enlargement", () => {
    const header = source("components/layout/AppHeader.tsx");

    expect(header).toContain("home-app-header-association-name");
    expect(header).toContain("break-words");
  });

  it("preserves RTL and reduced-motion/reduced-transparency platform preferences", () => {
    const layout = source("app/layout.tsx");
    const native = source("app/native-pwa.css");

    expect(layout).toContain("dir={getTextDirection(initialLocale)}");
    expect(native).toContain("@media (prefers-reduced-motion: reduce)");
    expect(native).toContain("@media (prefers-reduced-transparency: reduce)");
  });
});
