"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      const menu = menuRef.current;
      if (!menu?.open || !(event.target instanceof Node) || menu.contains(event.target)) return;
      menu.removeAttribute("open");
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") menuRef.current?.removeAttribute("open");
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const selectLanguage = (nextLocale: Locale) => {
    setLocale(nextLocale);
    menuRef.current?.removeAttribute("open");
  };

  return (
    <details ref={menuRef} className="language-menu relative">
      <summary
        className="flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-[10px] px-2 text-xs font-bold text-white transition-colors hover:bg-white/10 active:bg-white/10 marker:hidden"
        aria-label={t("settings.language")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          data-supericon="tabler:language"
          aria-hidden="true"
        >
          <path d="M9 6.371c0 4.418 -2.239 6.629 -5 6.629" />
          <path d="M4 6.371h7" />
          <path d="M5 9c0 2.144 2.252 3.908 6 4" />
          <path d="M12 20l4 -9l4 9" />
          <path d="M19.1 18h-6.2" />
          <path d="M6.694 3l.793 .582" />
        </svg>
        <span>{current.shortLabel}</span>
      </summary>
      <div className="absolute end-0 top-[calc(100%+8px)] z-30 w-40 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--home-divider)] bg-white p-1.5 text-[var(--home-text)] shadow-[0_10px_24px_rgba(17,24,22,0.14)]">
        {languageOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => selectLanguage(item.value)}
            aria-pressed={locale === item.value}
            className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-start text-sm font-semibold transition-colors ${
              locale === item.value
                ? "bg-[var(--home-brand-soft)] text-[var(--home-brand-strong)]"
                : "hover:bg-[var(--home-surface-subtle)]"
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
