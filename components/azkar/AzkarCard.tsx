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
      className={`card scroll-mt-6 overflow-hidden transition-colors ${
        completed
          ? "border-[var(--color-success)] bg-[var(--color-emerald-soft)]"
          : "bg-[var(--color-card)]"
      }`}
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-[var(--color-cream-deep)] px-2 text-xs font-extrabold text-[var(--color-gold-dark)]">
              {sequence}
            </span>
            {completed ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--color-success)]">
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
                ? "bg-[var(--color-gold)] text-[var(--color-emerald-dark)]"
                : "bg-[var(--color-cream-deep)] text-[var(--color-emerald)]"
            }`}
          >
            <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} aria-hidden="true" />
          </button>
        </div>

        <p
          className="mx-auto mt-5 max-w-2xl whitespace-pre-wrap break-words text-center text-[27px] font-medium leading-[2.05] text-[var(--color-emerald-dark)] sm:text-[32px]"
          dir="rtl"
          lang="ar"
        >
          {item.arabicText}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-[var(--color-muted)]" dir="ltr">
          {item.transliteration}
        </p>
        {translation ? (
          <p
            className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-[var(--color-charcoal)]"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            {translation}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setShowAllTranslations((current) => !current)}
          aria-expanded={showAllTranslations}
          className="mx-auto mt-4 flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-extrabold text-[var(--color-emerald)]"
        >
          {showAllTranslations ? t("azkar.hideTranslations") : t("azkar.showAllTranslations")}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showAllTranslations ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {showAllTranslations ? (
          <div className="mt-2 grid gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] p-3 text-sm leading-6">
            <p dir="ltr"><strong className="text-[var(--color-gold-dark)]">EN</strong> · {item.translationEn}</p>
            <p dir="ltr"><strong className="text-[var(--color-gold-dark)]">DE</strong> · {item.translationDe}</p>
            <p dir="ltr"><strong className="text-[var(--color-gold-dark)]">TR</strong> · {item.translationTr}</p>
          </div>
        ) : null}

        <p className="mt-4 border-t border-[var(--color-border)] pt-3 text-xs leading-5 text-[var(--color-muted)]">
          <span className="font-extrabold text-[var(--color-emerald)]">{t("azkar.source")}:</span> {item.source}
        </p>
      </div>

      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 border-t border-[var(--color-border)] bg-white/45 p-3 sm:p-4">
        <button
          type="button"
          onClick={onReset}
          disabled={count === 0}
          aria-label={t("azkar.resetItem")}
          className="grid h-12 w-11 place-items-center rounded-[14px] border border-[var(--color-border)] text-[var(--color-emerald)] transition disabled:cursor-not-allowed disabled:opacity-35"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onIncrement}
          disabled={completed}
          className={`flex min-h-12 items-center justify-center gap-3 rounded-[14px] px-4 font-extrabold transition active:scale-[0.99] disabled:cursor-default ${
            completed
              ? "bg-[var(--color-success)] text-white"
              : "bg-[var(--color-emerald)] text-[var(--color-card)] shadow-[var(--shadow-card)]"
          }`}
        >
          {completed ? <Check className="h-5 w-5" aria-hidden="true" /> : null}
          <span>{completed ? t("azkar.completed") : t("azkar.count")}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-sm" aria-live="polite">
            {count} / {item.repeatCount}
          </span>
        </button>
      </div>
    </article>
  );
}
