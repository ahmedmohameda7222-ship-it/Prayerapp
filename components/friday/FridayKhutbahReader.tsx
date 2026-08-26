"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatLongDate } from "@/lib/date-utils";
import {
  getAvailableKhutbahLanguages,
  getDefaultKhutbahLanguage,
  getKhutbahContentForLanguage,
  type FridayKhutbahLanguage,
} from "@/lib/friday-khutbah";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { FridayKhutbah } from "@/lib/types";

const LANGUAGE_LABELS: Record<FridayKhutbahLanguage, string> = {
  ar: "العربية",
  en: "English",
  de: "Deutsch",
  tr: "Türkçe",
};

const GENERIC_TITLES: Record<FridayKhutbahLanguage, string> = {
  ar: "خطبة الجمعة",
  en: "Friday Khutbah",
  de: "Freitagspredigt",
  tr: "Cuma Hutbesi",
};

const COPY: Record<Locale, {
  back: string;
  chooseLanguage: string;
  choosePrompt: string;
}> = {
  ar: {
    back: "العودة إلى الجمعة",
    chooseLanguage: "اختر لغة الخطبة",
    choosePrompt: "هذه الخطبة غير متوفرة بلغة التطبيق الحالية. اختر إحدى اللغات المتوفرة للقراءة.",
  },
  en: {
    back: "Back to Friday",
    chooseLanguage: "Choose khutbah language",
    choosePrompt: "This khutbah is not available in the current app language. Choose one of the available languages to read it.",
  },
  de: {
    back: "Zurück zum Freitag",
    chooseLanguage: "Sprache der Predigt wählen",
    choosePrompt: "Diese Predigt ist nicht in der aktuellen App-Sprache verfügbar. Wähle eine der verfügbaren Sprachen aus.",
  },
  tr: {
    back: "Cuma sayfasına dön",
    chooseLanguage: "Hutbe dilini seç",
    choosePrompt: "Bu hutbe mevcut uygulama dilinde yok. Okumak için mevcut dillerden birini seçin.",
  },
};

export function FridayKhutbahReader({ khutbah }: { khutbah: FridayKhutbah }) {
  const { locale } = useTranslation();
  const copy = COPY[locale];
  const availableLanguages = useMemo(() => getAvailableKhutbahLanguages(khutbah), [khutbah]);
  const [selectedLanguage, setSelectedLanguage] = useState<FridayKhutbahLanguage | null>(
    () => getDefaultKhutbahLanguage(khutbah, locale),
  );

  useEffect(() => {
    setSelectedLanguage(getDefaultKhutbahLanguage(khutbah, locale));
  }, [khutbah, locale]);

  const selected = selectedLanguage
    ? getKhutbahContentForLanguage(khutbah, selectedLanguage)
    : null;
  const contentDirection = selectedLanguage === "ar" ? "rtl" : "ltr";

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-7" data-testid="friday-khutbah-reader">
      <Link
        href="/friday"
        className="inline-flex min-h-11 items-center rounded-[14px] px-3 text-sm font-bold text-[var(--app-brand-strong)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {copy.back}
      </Link>

      <header className="mt-4 border-b border-[var(--color-border)] pb-5">
        <time dateTime={khutbah.date} className="text-sm font-semibold text-[var(--color-muted)]">
          {formatLongDate(khutbah.date, locale)}
        </time>
        <h1 className="mt-2 text-[clamp(1.5rem,4vw,2rem)] font-bold leading-tight text-[var(--color-charcoal)]">
          {selectedLanguage && selected
            ? selected.title || GENERIC_TITLES[selectedLanguage]
            : COPY[locale].chooseLanguage}
        </h1>
      </header>

      <section className="mt-5" aria-labelledby="khutbah-language-heading">
        <h2 id="khutbah-language-heading" className="text-sm font-bold text-[var(--color-charcoal)]">
          {copy.chooseLanguage}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label={copy.chooseLanguage}>
          {availableLanguages.map((language) => (
            <button
              key={language}
              type="button"
              role="tab"
              aria-selected={selectedLanguage === language}
              onClick={() => setSelectedLanguage(language)}
              className={`min-h-11 rounded-[14px] border px-4 text-sm font-bold ${selectedLanguage === language ? "border-[var(--app-brand)] bg-[var(--app-brand-soft)] text-[var(--app-brand-strong)]" : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-charcoal)]"}`}
            >
              {LANGUAGE_LABELS[language]}
            </button>
          ))}
        </div>
      </section>

      {!selectedLanguage || !selected ? (
        <p className="mt-6 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-base leading-7 text-[var(--color-muted)]" role="status">
          {copy.choosePrompt}
        </p>
      ) : (
        <article
          className="mt-7 break-words select-text whitespace-pre-wrap text-[17px] leading-[1.9] text-[var(--color-charcoal)] sm:text-[18px]"
          dir={contentDirection}
          lang={selectedLanguage}
          data-testid="friday-khutbah-content"
        >
          {selected.content}
        </article>
      )}
    </main>
  );
}
