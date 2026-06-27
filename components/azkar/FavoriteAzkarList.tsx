"use client";

import type { AzkarItem } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedAzkarTranslation } from "@/lib/i18n/localized-content";

export function FavoriteAzkarList({ items, onSelect }: { items: AzkarItem[]; onSelect?: (item: AzkarItem) => void }) {
  const { t, locale } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="card border-dashed p-5 text-center text-sm text-[var(--color-muted)]">
        {t("azkar.noFavorites")}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const translation = getLocalizedAzkarTranslation(item, locale);
        return (
          <button type="button" onClick={() => onSelect?.(item)} key={item.id} className="card p-4 text-start transition hover:border-[var(--color-gold)]">
            <p className="font-bold text-[var(--color-emerald)]">{item.transliteration}</p>
            {translation ? <p className="mt-1 text-sm text-[var(--color-muted)]">{translation}</p> : null}
            <p className="mt-2 text-xs text-[var(--color-muted)]"><span className="font-bold">{t("azkar.source")}:</span> {item.source}</p>
          </button>
        );
      })}
    </div>
  );
}
