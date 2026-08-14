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

type LanguageMenuTone = "home" | "app-inverted" | "surface";
type LanguageMenuAlign = "start" | "end";

export function LanguageMenu({
  tone = "home",
  align = "start",
}: {
  tone?: LanguageMenuTone;
  align?: LanguageMenuAlign;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const current = languageOptions.find((item) => item.value === locale) || languageOptions[0];
  const isHome = tone === "home";
  const triggerClass = tone === "surface"
    ? "text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-subtle)] active:bg-[var(--app-brand-soft)]"
    : "text-white hover:bg-white/10 active:bg-white/10";
  const menuAlignmentClass = align === "end" ? "end-0" : "start-0";

  const selectLanguage = (nextLocale: Locale) => {
    setLocale(nextLocale);
    menuRef.current?.removeAttribute("open");
  };

  return (
    <details ref={menuRef} className="language-menu relative">
      <summary
        className={`flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-[10px] px-2 text-xs font-bold transition-colors marker:hidden ${triggerClass}`}
        aria-label={t("settings.language")}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
        <span>{current.shortLabel}</span>
      </summary>
      <div className={`absolute ${menuAlignmentClass} top-[calc(100%+8px)] z-30 min-w-36 overflow-hidden rounded-xl border p-1.5 shadow-[0_10px_24px_rgba(17,24,22,0.14)] ${
        isHome
          ? "border-[var(--home-divider)] bg-white text-[var(--home-text)]"
          : "border-[var(--app-divider)] bg-[var(--app-surface)] text-[var(--app-text)]"
      }`}>
        {languageOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => selectLanguage(item.value)}
            aria-pressed={locale === item.value}
            className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-start text-sm font-semibold transition-colors ${
              locale === item.value
                ? isHome
                  ? "bg-[var(--home-brand-soft)] text-[var(--home-brand-strong)]"
                  : "bg-[var(--app-brand-soft)] text-[var(--app-brand-strong)]"
                : isHome
                  ? "hover:bg-[var(--home-surface-subtle)]"
                  : "hover:bg-[var(--app-surface-subtle)]"
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
