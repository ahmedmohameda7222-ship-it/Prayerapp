import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

/** CSS source contract: avoids renderer-specific 720p font-scaling regressions. */
function minSizeRem(styles: string, selector: string): number {
  const marker = `${selector} {`;
  const index = styles.indexOf(marker);
  if (index < 0) throw new Error(`Missing TV typography selector: ${selector}`);
  const end = styles.indexOf("}", index);
  const rule = styles.slice(index + marker.length, end);
  const size = rule.match(/font-size:\s*clamp\(\s*(\d+(?:\.\d+)?)rem\s*,/);
  if (!size) throw new Error(`No responsive rem minimum font-size for: ${selector}`);
  return Number(size[1]);
}

describe("32-inch Samsung/Fire Stick Calibri-first distance typography", () => {
  const css = () => read("app/tv-legibility.css");

  it("loads final TV typography after the original design without modifying prayer logic", () => {
    const layout = read("app/layout.tsx");
    const original = layout.indexOf('"./tv-v2.css"');
    const enhanced = layout.indexOf('"./tv-legibility.css"');
    expect(original).toBeGreaterThan(0);
    expect(enhanced).toBeGreaterThan(original);
    expect(layout).toContain('Carlito');
    expect(layout).toContain('Noto_Sans_Arabic');
    expect(layout).toContain('--font-carlito');
    expect(layout).toContain('--font-noto-arabic');
  });

  it("prefers Calibri for both languages, with reliable self-hosted Arabic and Latin fallbacks", () => {
    const styles = css();
    expect(styles).toMatch(/--tv-font-latin:\s*"Calibri",\s*var\(--font-carlito\)/);
    expect(styles).toMatch(/--tv-font-arabic:\s*"Calibri",\s*var\(--font-noto-arabic\)/);
    expect(styles).toContain('font-family: var(--tv-font-latin)');
    expect(styles).toContain('font-family: var(--tv-font-arabic)');
    expect(styles).not.toContain("@import url");
  });

  it("keeps header and ALL six prayer boxes large at 720p", () => {
    const styles = css();
    expect(minSizeRem(styles, ".tv-v2 .mosque-identity")).toBeGreaterThanOrEqual(1.75);
    expect(minSizeRem(styles, ".tv-v2 .header-dates")).toBeGreaterThanOrEqual(1.3);
    expect(minSizeRem(styles, ".tv-v2 .header-clock")).toBeGreaterThanOrEqual(3.5);
    expect(minSizeRem(styles, ".tv-v2 .prayer-labels")).toBeGreaterThanOrEqual(1.3);
    expect(minSizeRem(styles, ".tv-v2 .prayer-time")).toBeGreaterThanOrEqual(2.5);
    expect(minSizeRem(styles, ".tv-v2 .prayer-iqama")).toBeGreaterThanOrEqual(1.25);
    expect(minSizeRem(styles, ".tv-v2 .persistent-app-qr")).toBeGreaterThanOrEqual(1.1);
    expect(styles).toContain('grid-template-columns: repeat(6, minmax(0, 1fr))');
  });

  it("enlarges state messages, normal rotating dhikr, and post-prayer metadata", () => {
    const styles = css();
    expect(minSizeRem(styles, ".tv-v2 .state-eyebrow")).toBeGreaterThanOrEqual(1.85);
    expect(minSizeRem(styles, ".tv-v2 .azkar-arabic")).toBeGreaterThanOrEqual(3.2);
    expect(minSizeRem(styles, ".tv-v2 .azkar-german")).toBeGreaterThanOrEqual(1.8);
    expect(minSizeRem(styles, ".tv-v2 .after-title")).toBeGreaterThanOrEqual(2.5);
    expect(minSizeRem(styles, ".tv-v2 .after-dhikr-ar")).toBeGreaterThanOrEqual(3.5);
    expect(minSizeRem(styles, ".tv-v2 .after-dhikr-de")).toBeGreaterThanOrEqual(2.1);
    expect(minSizeRem(styles, ".tv-v2 .after-dhikr-meta")).toBeGreaterThanOrEqual(1.15);
    expect(styles).not.toMatch(/-webkit-line-clamp|text-overflow:\s*ellipsis/);
  });

  it("also enlarges Friday, announcements, event, campaign, QR captions and the fallback error screen", () => {
    const styles = css();
    expect(minSizeRem(styles, ".tv-v2 .friday-khutbah-body")).toBeGreaterThanOrEqual(1.8);
    expect(minSizeRem(styles, ".tv-v2 .friday-khutbah-pagination")).toBeGreaterThanOrEqual(1.15);
    expect(minSizeRem(styles, ".tv-v2 .event-meta span")).toBeGreaterThanOrEqual(1.25);
    expect(minSizeRem(styles, ".tv-v2 .campaign-donation-qr p")).toBeGreaterThanOrEqual(1.1);
    expect(minSizeRem(styles, ".tv-v2 .content-meta")).toBeGreaterThanOrEqual(1.15);
    expect(minSizeRem(styles, ".display-error-shell p")).toBeGreaterThanOrEqual(1.6);
  });
});
