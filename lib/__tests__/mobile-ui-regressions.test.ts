import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("mobile UI regression contract", () => {
  it("keeps Vercel deployments restricted to main", () => {
    const config = JSON.parse(source("vercel.json")) as {
      git?: { deploymentEnabled?: Record<string, boolean> };
    };

    expect(config.git?.deploymentEnabled?.["**"]).toBe(false);
    expect(config.git?.deploymentEnabled?.main).toBe(true);
  });

  it("keeps the language menu inside the mobile viewport and closes on outside press", () => {
    const menu = source("components/home/LanguageMenu.tsx");

    expect(menu).toContain('document.addEventListener("pointerdown", closeOnOutsidePointer)');
    expect(menu).toContain("menu.contains(event.target)");
    expect(menu).toContain("absolute end-0");
    expect(menu).toContain("max-w-[calc(100vw-2rem)]");
  });

  it("keeps direct WhatsApp and Google Maps shortcuts beside the account action", () => {
    const header = source("components/layout/AppHeader.tsx");

    expect(header).toContain("getMosqueSettings");
    expect(header).toContain('aria-label="WhatsApp"');
    expect(header).toContain('aria-label="Google Maps"');
    expect(header).toContain("settings.whatsappLink");
    expect(header).toContain("settings.googleMapsLink");
  });

  it("uses compact numeric ranges on the prayer-times page", () => {
    const browser = source("components/prayer/PrayerTimesBrowser.tsx");

    expect(browser).toContain("formatNumericDateRange");
    expect(browser).toContain('<span dir="ltr">{formatNumericDateRange(range.start, range.end)}</span>');
    expect(browser).not.toContain("formatDateRange(range.start, range.end");
  });

  it("saves favorites with INSERT so the operation matches the existing RLS policies", () => {
    const savedAzkar = source("lib/hooks/use-saved-azkar.ts");

    expect(savedAzkar).toMatch(/if \(saved\) \{[\s\S]*?\.insert\(\{ user_id: user\.id, azkar_id: azkarId \}/);
    expect(savedAzkar).toContain('saveError.code !== "23505"');
    expect(savedAzkar).toContain('.delete()');
  });
});
