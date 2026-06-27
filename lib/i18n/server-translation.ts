import { cookies } from "next/headers";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "./types";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import de from "../../messages/de.json";
import tr from "../../messages/tr.json";

const messages = { ar, en, de, tr };

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get("locale")?.value || DEFAULT_LOCALE);
}

export function getTranslation(locale: Locale) {
  const current = messages[locale] || messages.ar;

  function t(key: string, values?: Record<string, string | number>): string {
    const keys = key.split(".");
    let value: unknown = current;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        let fallback: unknown = messages.ar;
        for (const fk of keys) {
          if (fallback && typeof fallback === "object" && fk in fallback) {
            fallback = (fallback as Record<string, unknown>)[fk];
          } else {
            fallback = undefined;
            break;
          }
        }
        const fallbackText = typeof fallback === "string" ? fallback : key;
        return interpolate(fallbackText, values);
      }
    }
    return interpolate(typeof value === "string" ? value : key, values);
  }

  return { t, locale };
}

function interpolate(text: string, values?: Record<string, string | number>) {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/gu, (_, name: string) => String(values[name] ?? `{${name}}`));
}
