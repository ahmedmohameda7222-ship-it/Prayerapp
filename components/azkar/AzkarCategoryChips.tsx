"use client";

import { useState } from "react";
import type { AzkarCategory } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AzkarCategoryChips({ categories }: { categories: AzkarCategory[] }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AzkarCategory>("Morning");

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => setSelected(category)}
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
