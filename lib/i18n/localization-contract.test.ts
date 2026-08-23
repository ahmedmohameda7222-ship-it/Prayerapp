import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import de from "../../messages/de.json";
import tr from "../../messages/tr.json";
import { getTranslation } from "./server-translation";
import * as localeTypes from "./types";

type MessageTree = Record<string, unknown>;

type LocaleModuleWithDetector = typeof localeTypes & {
  detectSupportedLocale?: (acceptedLanguages: readonly string[]) => localeTypes.Locale;
};

function flattenKeys(value: MessageTree, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      return flattenKeys(child as MessageTree, path);
    }
    return [path];
  }).sort();
}

describe("localization authority contract", () => {
  it("falls back to English instead of silently booting unsupported users into Arabic", () => {
    expect(localeTypes.normalizeLocale(undefined)).toBe("en");
    expect(localeTypes.normalizeLocale("fr")).toBe("en");
  });

  it("selects the first supported browser language by base language", () => {
    const detect = (localeTypes as LocaleModuleWithDetector).detectSupportedLocale;
    expect(typeof detect).toBe("function");
    if (!detect) return;

    expect(detect(["de-DE", "en-US;q=0.8"])).toBe("de");
    expect(detect(["tr-TR", "de-DE;q=0.8"])).toBe("tr");
    expect(detect(["ar-EG", "en;q=0.7"])).toBe("ar");
    expect(detect(["fr-FR", "es-ES;q=0.8"])).toBe("en");
  });

  it("prevents browser machine translation and wires request-language detection into the root layout", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");

    expect(layout).toContain('translate="no"');
    expect(layout).toContain('google: "notranslate"');
    expect(layout).toContain("detectSupportedLocale");
    expect(layout).toContain("accept-language");
  });

  it("keeps every locale catalog on the same translation-key contract", () => {
    const expected = flattenKeys(ar as MessageTree);
    expect(flattenKeys(en as MessageTree)).toEqual(expected);
    expect(flattenKeys(de as MessageTree)).toEqual(expected);
    expect(flattenKeys(tr as MessageTree)).toEqual(expected);
  });

  it("uses one approved runtime prayer-name contract instead of literal or mixed translations", () => {
    expect(en.prayer).toMatchObject({
      fajr: "Fajr",
      sunrise: "Sunrise",
      dhuhr: "Dhuhr",
      asr: "Asr",
      maghrib: "Maghrib",
      isha: "Isha",
    });

    const german = getTranslation("de").t;
    expect({
      fajr: german("prayer.fajr"),
      sunrise: german("prayer.sunrise"),
      dhuhr: german("prayer.dhuhr"),
      asr: german("prayer.asr"),
      maghrib: german("prayer.maghrib"),
      isha: german("prayer.isha"),
      salatFajr: german("prayer.salatFajr"),
      salatIsha: german("prayer.salatIsha"),
    }).toEqual({
      fajr: "Fajr",
      sunrise: "Sonnenaufgang",
      dhuhr: "Dhuhr",
      asr: "Asr",
      maghrib: "Maghrib",
      isha: "Isha",
      salatFajr: "Salat Fajr",
      salatIsha: "Salat Isha",
    });

    const clientTranslation = readFileSync(join(process.cwd(), "lib/i18n/use-translation.ts"), "utf8");
    const serverTranslation = readFileSync(join(process.cwd(), "lib/i18n/server-translation.ts"), "utf8");
    expect(clientTranslation).toContain("getPrayerTranslationOverride");
    expect(serverTranslation).toContain("getPrayerTranslationOverride");

    const forbiddenEnglishPrayerNames = new Set(["dawn", "noon", "the era", "morocco", "dinner", "accommodation"]);
    for (const value of Object.values(en.prayer)) {
      expect(forbiddenEnglishPrayerNames.has(String(value).toLowerCase())).toBe(false);
    }
  });

  it("loads a scoped mobile prayer-grid rule that reserves fixed time and control columns", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    const cssPath = join(process.cwd(), "app/prayer-table-localization.css");

    expect(layout).toContain('import "./prayer-table-localization.css"');
    expect(existsSync(cssPath)).toBe(true);
    if (!existsSync(cssPath)) return;

    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain(".home-prayer-board > .grid");
    expect(css).toContain('.home-prayer-board [data-prayer-row] > .grid');
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) 4rem 4rem 3.25rem");
    expect(css).toContain("gap: 0.25rem");
  });
});
