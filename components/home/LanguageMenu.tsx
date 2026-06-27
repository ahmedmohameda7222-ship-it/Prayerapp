"use client";

import { useRef } from "react";
import { Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/use-translation";

const languageOptions: Array<{ value: Locale; label: string; shortLabel: string }> = [
  { value: "ar", label: "العربية", shortLabel: "AR" },
  { value: "en", label: "English", shortLabel: "EN" },
  { value: "de", label: "Deutsch", shortLabel: "DE" },
  { value: "tr", label: "Türkçe", shortLabel: "TR" },
];

export function LanguageMenu() {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const current = languageOptions.find((item) => item.value === locale) || languageOptions[0];

  const selectLanguage = (nextLocale: Locale) => {
    setLocale(nextLocale);
    menuRef.current?.removeAttribute("open");
  };

  return (
    <details ref={menuRef} className="language-menu relative">
      <summary
        className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-full border border-[var(--color-gold)]/45 bg-[var(--color-emerald-dark)]/78 px-3 text-xs font-extrabold text-[var(--color-gold-soft)] shadow-sm backdrop-blur-md marker:hidden"
        aria-label={t("settings.language")}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
        <span>{current.shortLabel}</span>
      </summary>
      <div className="absolute start-0 top-[calc(100%+8px)] z-30 min-w-36 overflow-hidden rounded-2xl border border-[var(--color-gold)]/25 bg-[var(--color-card)] p-1.5 text-[var(--color-emerald-dark)] shadow-[var(--shadow-card)]">
        {languageOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => selectLanguage(item.value)}
            aria-pressed={locale === item.value}
            className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-start text-sm font-bold transition-colors ${
              locale === item.value
                ? "bg-[var(--color-emerald)] text-[var(--color-card)]"
                : "hover:bg-[var(--color-emerald-soft)]"
            }`}
          >
            <span>{item.label}</span>
            <span className="text-[10px] opacity-70">{item.shortLabel}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
