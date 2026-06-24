"use client";

import { useLocale } from "./context";
import en from "../../messages/en.json";
import de from "../../messages/de.json";
import ar from "../../messages/ar.json";
import type { Locale } from "./types";

const messages = { en, de, ar };

export function useTranslation() {
  const { locale } = useLocale();
  const current = messages[locale] || messages.en;

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: unknown = current;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Fallback chain: current locale -> en -> key itself
        let fallback: unknown = messages.en;
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
