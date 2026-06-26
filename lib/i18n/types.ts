export const SUPPORTED_LOCALES = ["ar", "en", "de", "tr"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ar";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function localeFieldSuffix(locale: Locale): "Ar" | "En" | "De" | "Tr" {
  if (locale === "ar") return "Ar";
  if (locale === "de") return "De";
  if (locale === "tr") return "Tr";
  return "En";
}
