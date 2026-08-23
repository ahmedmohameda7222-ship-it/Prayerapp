export const SUPPORTED_LOCALES = ["ar", "en", "de", "tr"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function detectSupportedLocale(acceptedLanguages: readonly string[]): Locale {
  const candidates = acceptedLanguages
    .map((value, index) => {
      const [languageRange = "", ...parameters] = value.trim().toLowerCase().split(";");
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
      const quality = qualityParameter ? Number.parseFloat(qualityParameter.trim().slice(2)) : 1;
      const baseLanguage = languageRange.split("-")[0];
      return {
        locale: isLocale(baseLanguage) ? baseLanguage : null,
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter((candidate) => candidate.locale && candidate.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  return candidates[0]?.locale || DEFAULT_LOCALE;
}

export function localeFieldSuffix(locale: Locale): "Ar" | "En" | "De" | "Tr" {
  if (locale === "ar") return "Ar";
  if (locale === "de") return "De";
  if (locale === "tr") return "Tr";
  return "En";
}
