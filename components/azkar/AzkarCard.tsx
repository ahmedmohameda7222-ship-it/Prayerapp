"use client";

import { useState } from "react";
import { Check, ChevronDown, Heart, RotateCcw } from "lucide-react";
import { getLocalizedAzkarTranslation } from "@/lib/i18n/localized-content";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { AzkarItem } from "@/lib/types";

export function AzkarCard({
  item,
  sequence,
  count,
  isFavorite,
  onIncrement,
  onReset,
  onToggleFavorite,
}: {
  item: AzkarItem;
  sequence: number;
  count: number;
  isFavorite: boolean;
  onIncrement: () => void;
  onReset: () => void;
  onToggleFavorite: () => void;
}) {
  const { t, locale } = useTranslation();
  const [showAllTranslations, setShowAllTranslations] = useState(false);
  const translation = getLocalizedAzkarTranslation(item, locale);
  const completed = count >= item.repeatCount;

  return (
    <article
      id={`azkar-${item.id}`}
      className={`card scroll-mt-24 overflow-hidden transition-colors ${completed ? "border-[color-mix(in_srgb,var(--app-brand)_32%,var(--app-divider))]" : ""}`}
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-[var(--app-surface-soft)] px-2 text-xs font-semibold text-[var(--app-text-secondary)]">
              {sequence}
            </span>
            {completed ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--app-brand)]">
                <Check className="h-4 w-4" aria-hidden="true" />
                {t("azkar.completed")}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? t("azkar.removeFavorite") : t("azkar.addFavorite")}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors ${
              isFavorite
                ? "bg-[var(--app-brand-soft)] text-[var(--app-brand)]"
                : "bg-transparent text-[var(--app-text-secondary)]"
            }`}
          >
            <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} aria-hidden="true" />
          </button>
        </div>

        <p
          className="mx-auto mt-5 max-w-2xl whitespace-pre-wrap break-words text-center text-[29px] font-medium leading-[2.05] text-[var(--app-text)] sm:text-[34px]"
          dir="rtl"
          lang="ar"
        >
          {item.arabicText}
        </p>
        {item.transliteration ? (
          <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-7 text-[var(--app-text-secondary)]" dir="ltr">
            {item.transliteration}
          </p>
        ) : null}
        {translation ? (
          <p
            className="mx-auto mt-4 max-w-2xl text-center text-base leading-8 text-[var(--app-text)]"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            {translation}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setShowAllTranslations((current) => !current)}
          aria-expanded={showAllTranslations}
          className="mx-auto mt-4 flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold text-[var(--app-brand)]"
        >
          {showAllTranslations ? t("azkar.hideTranslations") : t("azkar.showAllTranslations")}
          <ChevronDown className={`h-4 w-4 transition-transform ${showAllTranslations ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>

        {showAllTranslations ? (
          <div className="mt-2 grid gap-2 rounded-[14px] border border-[var(--app-divider)] bg-[var(--app-surface-soft)] p-3 text-sm leading-6 text-[var(--app-text-secondary)]">
            <p dir="ltr"><strong className="text-[var(--app-text)]">EN</strong> · {item.translationEn}</p>
            <p dir="ltr"><strong className="text-[var(--app-text)]">DE</strong> · {item.translationDe}</p>
            <p dir="ltr"><strong className="text-[var(--app-text)]">TR</strong> · {item.translationTr}</p>
          </div>
        ) : null}

        <p className="mt-5 border-t border-[var(--app-divider)] pt-3 text-xs leading-5 text-[var(--app-text-secondary)]">
          <span className="font-semibold text-[var(--app-text)]">{t("azkar.source")}:</span> {item.source}
        </p>
      </div>

      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 border-t border-[var(--app-divider)] bg-[var(--app-surface-soft)] p-3 sm:p-4">
        <button
          type="button"
          onClick={onReset}
          disabled={count === 0}
          aria-label={t("azkar.resetItem")}
          className="grid h-12 w-11 place-items-center rounded-[12px] border border-[var(--app-divider)] bg-[var(--app-surface)] text-[var(--app-brand)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onIncrement}
          disabled={completed}
          className={`flex min-h-12 items-center justify-center gap-3 rounded-[12px] px-4 font-semibold active:scale-[0.99] disabled:cursor-default ${
            completed
              ? "bg-[var(--app-brand-soft)] text-[var(--app-brand-strong)]"
              : "bg-[var(--app-brand)] text-white"
          }`}
        >
          {completed ? <Check className="h-5 w-5" aria-hidden="true" /> : null}
          <span>{completed ? t("azkar.completed") : t("azkar.count")}</span>
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-sm" aria-live="polite">
            {count} / {item.repeatCount}
          </span>
        </button>
      </div>
    </article>
  );
}
