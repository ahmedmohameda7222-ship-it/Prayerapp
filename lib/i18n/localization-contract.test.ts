import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import de from "../../messages/de.json";
import tr from "../../messages/tr.json";
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

  it("uses approved prayer names instead of literal machine-translated English or mixed German spellings", () => {
    expect(en.prayer).toMatchObject({
      fajr: "Fajr",
      sunrise: "Sunrise",
      dhuhr: "Dhuhr",
      asr: "Asr",
      maghrib: "Maghrib",
      isha: "Isha",
    });
    expect(de.prayer).toMatchObject({
      fajr: "Fajr",
      sunrise: "Sonnenaufgang",
      dhuhr: "Dhuhr",
      asr: "Asr",
      maghrib: "Maghrib",
      isha: "Isha",
      salatFajr: "Salat Fajr",
      salatIsha: "Salat Isha",
    });

    const forbiddenEnglishPrayerNames = new Set(["dawn", "noon", "the era", "morocco", "dinner", "accommodation"]);
    for (const value of Object.values(en.prayer)) {
      expect(forbiddenEnglishPrayerNames.has(String(value).toLowerCase())).toBe(false);
    }
  });
});
