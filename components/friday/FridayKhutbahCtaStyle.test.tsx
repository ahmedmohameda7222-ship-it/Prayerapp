import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Friday khutbah CTA rendered contrast", () => {
  it("pins the published khutbah CTA to the approved light foreground in Friday page CSS", () => {
    const css = source("app/friday-page.css");

    expect(css).toContain('.home-page-shell .friday-page [data-testid="friday-khutbah-cta"]');
    expect(css).toMatch(/\[data-testid="friday-khutbah-cta"\][^{]*\{[^}]*color:\s*#fcfaf6;/i);
  });
});
