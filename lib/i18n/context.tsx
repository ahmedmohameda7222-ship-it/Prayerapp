"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Locale } from "./types";

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
});

const COOKIE_NAME = "locale";

function getCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
  if (match) {
    const value = match[2];
    if (value === "en" || value === "de" || value === "ar") return value;
  }
  return null;
}

function getBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language;
  if (lang.startsWith("de")) return "de";
  if (lang.startsWith("ar")) return "ar";
  return "en";
}

function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return getCookieLocale() || getBrowserLocale();
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    document.cookie = `${COOKIE_NAME}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale() {
  return useContext(I18nContext);
}

export { I18nContext };
