"use client";

import type { AzkarItem } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedAzkarTranslation } from "@/lib/i18n/localized-content";

export function FavoriteAzkarList({ items }: { items: AzkarItem[] }) {
  const { locale } = useTranslation();

  return (
    <div className="grid gap-3">
      {items.slice(0, 2).map((item) => {
        const translation = getLocalizedAzkarTranslation(item, locale);
        return (
          <article key={item.id} className="card p-4">
            <p className="font-bold text-[var(--color-emerald)]">{item.transliteration}</p>
            {translation ? <p className="mt-1 text-sm text-[var(--color-muted)]">{translation}</p> : null}
          </article>
        );
      })}
    </div>
  );
}
