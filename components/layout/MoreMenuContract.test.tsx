import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const morePage = readFileSync(join(process.cwd(), "app/more/page.tsx"), "utf8");

describe("More menu legal links", () => {
  it("keeps Privacy visible while removing the Legal Notice entry", () => {
    expect(morePage).toContain('["/privacy", "legal.privacyTitle"');
    expect(morePage).not.toContain('"/imprint"');
    expect(morePage).not.toContain('"legal.imprintTitle"');
  });
});
