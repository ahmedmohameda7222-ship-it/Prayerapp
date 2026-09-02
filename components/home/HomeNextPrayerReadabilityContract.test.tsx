import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

describe("Home Next Prayer elderly-readability contract", () => {
  it("keeps the instrument semantic and live without inline size authority", () => {
    const component = source("components/prayer/PrayerCountdown.tsx");
    const instrument = component.slice(
      component.indexOf('if (variant === "instrument")'),
      component.indexOf("  return (\n    <>", component.indexOf('if (variant === "instrument")')),
    );

    expect(instrument).toContain("home-next-prayer-label");
    expect(instrument).toContain("home-next-prayer-name");
    expect(instrument).toContain("home-next-prayer-adhan");
    expect(instrument).toContain("home-next-prayer-countdown");
    expect(instrument).toContain("home-next-prayer-iqama");
    expect(instrument).toContain('aria-live="polite"');
    expect(instrument).not.toMatch(/text-\[(?:15|26|32|23)px\]|text-sm/);
  });

  it("uses the approved mobile readability scale", () => {
    const css = source("app/home-ui.css");

    expect(css).toMatch(/\.home-page-shell \.home-next-prayer-label\s*\{[\s\S]*?font-size:\s*16px;/);
    expect(css).toMatch(/\.home-page-shell \.home-next-prayer-name\s*\{[\s\S]*?font-size:\s*32px;/);
    expect(css).toMatch(/\.home-page-shell \.home-next-prayer-adhan\s*\{[\s\S]*?font-size:\s*40px;/);
    expect(css).toMatch(/\.home-page-shell \.home-next-prayer-countdown\s*\{[\s\S]*?font-size:\s*28px;/);
    expect(css).toMatch(/\.home-page-shell \.home-next-prayer-iqama\s*\{[\s\S]*?font-size:\s*16px;/);
  });

  it("uses the approved desktop readability scale", () => {
    const css = source("app/home-ui.css");
    const desktop = css.slice(css.indexOf("@media (min-width: 1024px)"));

    expect(desktop).toMatch(/\.home-page-shell \.home-next-prayer-label\s*\{[\s\S]*?font-size:\s*17px;/);
    expect(desktop).toMatch(/\.home-page-shell \.home-next-prayer-name\s*\{[\s\S]*?font-size:\s*36px;/);
    expect(desktop).toMatch(/\.home-page-shell \.home-next-prayer-adhan\s*\{[\s\S]*?font-size:\s*48px;/);
    expect(desktop).toMatch(/\.home-page-shell \.home-next-prayer-countdown\s*\{[\s\S]*?font-size:\s*32px;/);
    expect(desktop).toMatch(/\.home-page-shell \.home-next-prayer-iqama\s*\{[\s\S]*?font-size:\s*18px;/);
  });
});
