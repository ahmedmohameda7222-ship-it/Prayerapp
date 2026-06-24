"use client";

import { useLocale } from "./context";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import de from "../../messages/de.json";
import tr from "../../messages/tr.json";
import type { Locale } from "./types";

const messages = { ar, en, de, tr };

export function useTranslation() {
  const { locale } = useLocale();
  const current = messages[locale] || messages.ar;

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: unknown = current;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Fallback chain: current locale -> Arabic -> key itself
        let fallback: unknown = messages.ar;
        for (const fk of keys) {
          if (fallback && typeof fallback === "object" && fk in fallback) {
            fallback = (fallback as Record<string, unknown>)[fk];
          } else {
            fallback = undefined;
            break;
          }
        }
        return typeof fallback === "string" ? fallback : key;
      }
    }
    return typeof value === "string" ? value : key;
  };

  return { t, locale: locale as Locale };
}
