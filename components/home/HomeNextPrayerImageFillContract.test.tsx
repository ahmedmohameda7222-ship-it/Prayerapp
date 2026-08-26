import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Home Next Prayer mobile image fill", () => {
  it("fills the entire narrow Next Prayer surface without contain letterboxing", () => {
    const css = source("app/home-ui.css");
    const narrowStart = css.indexOf("@media (max-width: 420px)");

    expect(narrowStart).toBeGreaterThan(-1);
    const narrow = css.slice(narrowStart);
    expect(narrow).toMatch(/\.home-page-shell \.home-next-prayer-media img\s*\{[\s\S]*?object-fit:\s*cover;/);
  });
});
