"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { getTextDirection } from "./direction";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "./types";

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

const COOKIE_NAME = "locale";
const STORAGE_NAME = "locale";

export function I18nProvider({ children, initialLocale = DEFAULT_LOCALE }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getTextDirection(locale);
    window.localStorage.setItem(STORAGE_NAME, locale);
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    const normalizedLocale = normalizeLocale(nextLocale);
    setLocaleState(normalizedLocale);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale() {
  return useContext(I18nContext);
}

export { I18nContext };
