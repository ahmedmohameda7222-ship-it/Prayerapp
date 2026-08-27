import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("approved Arabic header wordmark", () => {
  it("ships the newly approved spaced two-word vector artwork", () => {
    const asset = source("public/branding/masjid-al-danube-ar.svg");

    expect(asset).toContain('data-approved-wordmark="2026-08-27-spaced"');
    expect(asset).toContain('id="word-masjid"');
    expect(asset).toContain('id="word-danube"');
    expect(asset).toContain("مَسْجِدُ الدُّونَاوْ");
    expect(asset).not.toMatch(/<image\b/i);
    expect(asset).not.toMatch(/data:image\//i);
  });

  it("renders the Arabic wordmark at the approved larger header scale", () => {
    const header = source("components/layout/AppHeader.tsx");

    expect(header).toContain("width={280}");
    expect(header).toContain("height={93}");
    expect(header).toContain("w-[clamp(220px,62vw,280px)]");
  });
});
