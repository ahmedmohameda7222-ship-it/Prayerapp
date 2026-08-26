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

function value(data: Partial<Record<keyof FridayKhutbahForm, string>>, key: keyof FridayKhutbahForm) {
  return typeof data[key] === "string" ? data[key]!.trim() : "";
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
