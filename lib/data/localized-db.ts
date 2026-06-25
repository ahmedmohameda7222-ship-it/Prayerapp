import { SUPPORTED_LOCALES, localeFieldSuffix } from "@/lib/i18n/types";

export function readDbString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

export function localizedFieldsFromDb(
  row: Record<string, unknown>,
  camelBase: string,
  dbBase: string,
  legacyDbBase = dbBase
): Record<string, string> {
  const legacyValue = readDbString(row, legacyDbBase);
  const fields: Record<string, string> = {};

  for (const locale of SUPPORTED_LOCALES) {
    const camelKey = `${camelBase}${localeFieldSuffix(locale)}`;
    const dbKey = `${dbBase}_${locale}`;
    fields[camelKey] = readDbString(row, dbKey) || (locale === "ar" ? legacyValue : "");
  }

  return fields;
}

export function localizedFieldsToDb(
  item: Record<string, unknown>,
  camelBase: string,
  dbBase: string,
  options: { includeLegacy?: boolean } = {}
): Record<string, unknown> {
  const db: Record<string, unknown> = {};

  for (const locale of SUPPORTED_LOCALES) {
    const camelKey = `${camelBase}${localeFieldSuffix(locale)}`;
    const value = item[camelKey];
    if (value !== undefined) {
      db[`${dbBase}_${locale}`] = typeof value === "string" ? value.trim() : value;
    }
  }

  if (options.includeLegacy) {
    const legacyValue =
      item[`${camelBase}${localeFieldSuffix("ar")}`] || item[camelBase];
    if (legacyValue !== undefined) db[dbBase] = legacyValue;
  }

  return db;
}
