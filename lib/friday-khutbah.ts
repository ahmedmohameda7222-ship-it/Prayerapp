import type { Locale } from "@/lib/i18n/types";
import type { FridayKhutbah } from "@/lib/types";

export type FridayKhutbahForm = {
  titleAr: string;
  contentAr: string;
  titleEn: string;
  contentEn: string;
  titleDe: string;
  contentDe: string;
  titleTr: string;
  contentTr: string;
};

export type FridayKhutbahLanguage = Locale;

const KHUTBAH_FORM_KEYS = [
  "titleAr",
  "contentAr",
  "titleEn",
  "contentEn",
  "titleDe",
  "contentDe",
  "titleTr",
  "contentTr",
] as const;

const CONTENT_KEYS = ["contentAr", "contentEn", "contentDe", "contentTr"] as const;
const KHUTBAH_LANGUAGES: FridayKhutbahLanguage[] = ["ar", "en", "de", "tr"];

const FIELD_BY_LANGUAGE: Record<FridayKhutbahLanguage, {
  title: keyof Pick<FridayKhutbah, "titleAr" | "titleEn" | "titleDe" | "titleTr">;
  content: keyof Pick<FridayKhutbah, "contentAr" | "contentEn" | "contentDe" | "contentTr">;
}> = {
  ar: { title: "titleAr", content: "contentAr" },
  en: { title: "titleEn", content: "contentEn" },
  de: { title: "titleDe", content: "contentDe" },
  tr: { title: "titleTr", content: "contentTr" },
};

function value(data: Partial<Record<keyof FridayKhutbahForm, string>>, key: keyof FridayKhutbahForm) {
  return typeof data[key] === "string" ? data[key]!.trim() : "";
}

function cleanKhutbahField(value: string | undefined) {
  return value?.trim() || "";
}

export function normalizeKhutbahForm(
  data: Partial<Record<keyof FridayKhutbahForm, string>>,
): FridayKhutbahForm {
  return Object.fromEntries(KHUTBAH_FORM_KEYS.map((key) => [key, value(data, key)])) as FridayKhutbahForm;
}

export function hasPublishableKhutbahContent(
  data: Partial<Record<keyof FridayKhutbahForm, string>>,
): boolean {
  return CONTENT_KEYS.some((key) => value(data, key).length > 0);
}

export function getAvailableKhutbahLanguages(khutbah: FridayKhutbah): FridayKhutbahLanguage[] {
  return KHUTBAH_LANGUAGES.filter((locale) => {
    const fields = FIELD_BY_LANGUAGE[locale];
    return cleanKhutbahField(khutbah[fields.content]).length > 0;
  });
}

export function getDefaultKhutbahLanguage(
  khutbah: FridayKhutbah,
  locale: Locale,
): FridayKhutbahLanguage | null {
  return getAvailableKhutbahLanguages(khutbah).includes(locale) ? locale : null;
}

export function getKhutbahContentForLanguage(
  khutbah: FridayKhutbah,
  locale: FridayKhutbahLanguage,
): { title: string; content: string } | null {
  const fields = FIELD_BY_LANGUAGE[locale];
  const content = cleanKhutbahField(khutbah[fields.content]);
  if (!content) return null;
  return {
    title: cleanKhutbahField(khutbah[fields.title]),
    content,
  };
}
