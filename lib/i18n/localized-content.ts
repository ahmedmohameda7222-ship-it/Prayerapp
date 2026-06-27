import { localeFieldSuffix, type Locale, SUPPORTED_LOCALES } from "./types";

type LocalizedRecord = object;

function fallbackLocales(locale: Locale): Locale[] {
  const ordered: Locale[] = [];
  for (const item of [locale, "de", "ar", "en", ...SUPPORTED_LOCALES] as Locale[]) {
    if (!ordered.includes(item)) ordered.push(item);
  }
  return ordered;
}

function fieldCandidates(baseField: string, locale: Locale): string[] {
  const suffix = localeFieldSuffix(locale);
  return [`${baseField}${suffix}`, `${baseField}_${locale}`];
}

function readNonEmpty(item: LocalizedRecord, key: string): string {
  const value = (item as Record<string, unknown>)[key];
  if (typeof value !== "string") return "";
  return value.trim();
}

export function getLocalizedField<T extends LocalizedRecord>(
  item: T | null | undefined,
  baseField: string,
  locale: Locale
): string {
  if (!item) return "";

  for (const candidateLocale of fallbackLocales(locale)) {
    for (const key of fieldCandidates(baseField, candidateLocale)) {
      const value = readNonEmpty(item, key);
      if (value) return value;
    }
  }

  const legacyValue = readNonEmpty(item, baseField);
  if (legacyValue) return legacyValue;

  for (const candidateLocale of SUPPORTED_LOCALES) {
    for (const key of fieldCandidates(baseField, candidateLocale)) {
      const value = readNonEmpty(item, key);
      if (value) return value;
    }
  }

  return "";
}

export function getLocalizedText<T extends LocalizedRecord>(
  item: T | null | undefined,
  fieldName: string,
  locale: Locale
): string {
  const baseField = fieldName.replace(/_(ar|en|de|tr)$/u, "");
  return getLocalizedField(item, baseField, locale);
}

export function getLocalizedAzkarTranslation<T extends LocalizedRecord>(
  item: T | null | undefined,
  locale: Locale
): string {
  if (locale === "ar") {
    if (!item) return "";
    for (const key of fieldCandidates("translation", "ar")) {
      const value = readNonEmpty(item, key);
      if (value) return value;
    }
    return "";
  }

  return getLocalizedField(item, "translation", locale);
}
