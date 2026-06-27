"use client";

import type { AzkarItem } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedAzkarTranslation } from "@/lib/i18n/localized-content";

export function FavoriteAzkarList({ items, onSelect }: { items: AzkarItem[]; onSelect?: (item: AzkarItem) => void }) {
  const { locale } = useTranslation();

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const translation = getLocalizedAzkarTranslation(item, locale);
        return (
          <button type="button" onClick={() => onSelect?.(item)} key={item.id} className="card p-4 text-start">
            <p className="font-bold text-[var(--color-emerald)]">{item.transliteration}</p>
            {translation ? <p className="mt-1 text-sm text-[var(--color-muted)]">{translation}</p> : null}
          </button>
        );
      })}
    </div>
  );
}
