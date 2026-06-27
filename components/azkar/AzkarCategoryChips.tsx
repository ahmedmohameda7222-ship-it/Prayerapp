"use client";

import type { AzkarCategory } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AzkarCategoryChips({ categories, selected, onSelect }: { categories: AzkarCategory[]; selected: AzkarCategory; onSelect: (category: AzkarCategory) => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          aria-pressed={selected === category}
          onClick={() => onSelect(category)}
          className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold ${
            selected === category ? "border-[var(--color-emerald)] bg-[var(--color-emerald)] text-[var(--color-card)]" : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-emerald)]"
          }`}
        >
          {t(`azkarCategories.${category}`)}
        </button>
      ))}
    </div>
  );
}
