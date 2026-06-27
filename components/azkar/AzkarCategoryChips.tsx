"use client";

import type { AzkarCategory } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/use-translation";

export type AzkarTab = AzkarCategory | "Favorites";

export function AzkarCategoryChips({ categories, selected, onSelect }: { categories: AzkarCategory[]; selected: AzkarTab; onSelect: (tab: AzkarTab) => void }) {
  const { t } = useTranslation();
  const tabs: AzkarTab[] = ["Favorites", ...categories];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          aria-pressed={selected === tab}
          onClick={() => onSelect(tab)}
          className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold ${
            selected === tab ? "border-[var(--color-emerald)] bg-[var(--color-emerald)] text-[var(--color-card)]" : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-emerald)]"
          }`}
        >
          {tab === "Favorites" ? t("azkar.favorites") : t(`azkarCategories.${tab}`)}
        </button>
      ))}
    </div>
  );
}
