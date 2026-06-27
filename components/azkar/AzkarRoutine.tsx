"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AzkarCard } from "@/components/azkar/AzkarCard";
import { AzkarCategoryChips } from "@/components/azkar/AzkarCategoryChips";
import { FavoriteAzkarList } from "@/components/azkar/FavoriteAzkarList";
import { TasbeehCounter } from "@/components/azkar/TasbeehCounter";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { AzkarCategory, AzkarItem } from "@/lib/types";

const PROGRESS_KEY = "azkar_progress_v1";
const FAVORITES_KEY = "azkar_favorites_v1";

type StoredProgress = {
  date: string;
  lastSelectedCategory: AzkarCategory;
  counts: Record<string, number>;
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function smartDefaultCategory(date: Date): AzkarCategory {
  if (date.getDay() === 5) return "Friday";

  const hour = date.getHours();
  if (hour >= 4 && hour < 12) return "Morning";
  if (hour >= 15 && hour < 22) return "Evening";
  if (hour >= 22 || hour < 4) return "Sleep";
  return "Morning";
}

function isCategory(value: unknown, categories: AzkarCategory[]): value is AzkarCategory {
  return typeof value === "string" && categories.includes(value as AzkarCategory);
}

function readStoredProgress(categories: AzkarCategory[]): StoredProgress {
  const now = new Date();
  const today = localDateKey(now);
  const fallbackCategory = smartDefaultCategory(now);

  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      return { date: today, lastSelectedCategory: fallbackCategory, counts: {} };
    }

    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    const lastSelectedCategory = isCategory(parsed.lastSelectedCategory, categories)
      ? parsed.lastSelectedCategory
      : fallbackCategory;

    if (parsed.date !== today || !parsed.counts || typeof parsed.counts !== "object") {
      return { date: today, lastSelectedCategory, counts: {} };
    }

    const counts: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed.counts)) {
      if (Number.isFinite(value) && value >= 0) counts[id] = Math.floor(value);
    }

    return { date: today, lastSelectedCategory, counts };
  } catch {
    return { date: today, lastSelectedCategory: fallbackCategory, counts: {} };
  }
}

function readFavoriteIds(validIds: Set<string>) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && validIds.has(id)));
  } catch {
    return new Set<string>();
  }
}

export function AzkarRoutine({
  categories,
  items,
}: {
  categories: AzkarCategory[];
  items: AzkarItem[];
}) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<AzkarCategory>("Morning");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const validIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);

  /* eslint-disable react-hooks/set-state-in-effect -- localStorage is only available after mount. */
  useEffect(() => {
    const stored = readStoredProgress(categories);
    setSelectedCategory(stored.lastSelectedCategory);
    setCounts(stored.counts);
    setFavoriteIds(readFavoriteIds(validIds));
    setHydrated(true);
  }, [categories, validIds]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    const progress: StoredProgress = {
      date: localDateKey(new Date()),
      lastSelectedCategory: selectedCategory,
      counts,
    };

    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // The routine remains usable when storage is unavailable.
    }
  }, [counts, hydrated, selectedCategory]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favoriteIds]));
    } catch {
      // Favorites simply remain in memory when storage is unavailable.
    }
  }, [favoriteIds, hydrated]);

  const categoryItems = useMemo(
    () => items.filter((item) => item.category === selectedCategory),
    [items, selectedCategory]
  );
  const favoriteItems = useMemo(
    () => items.filter((item) => favoriteIds.has(item.id)),
    [favoriteIds, items]
  );
  const completedCount = useMemo(
    () => categoryItems.filter((item) => (counts[item.id] || 0) >= item.repeatCount).length,
    [categoryItems, counts]
  );
  const totalCount = categoryItems.length;
  const progressPercent = totalCount ? (completedCount / totalCount) * 100 : 0;
  const localizedCategory = t(`azkarCategories.${selectedCategory}`);

  const incrementItem = useCallback((item: AzkarItem) => {
    setCounts((current) => ({
      ...current,
      [item.id]: Math.min((current[item.id] || 0) + 1, item.repeatCount),
    }));
  }, []);

  const resetItem = useCallback((id: string) => {
    setCounts((current) => ({ ...current, [id]: 0 }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openFavorite = useCallback((item: AzkarItem) => {
    setSelectedCategory(item.category);
    window.setTimeout(() => {
      document.getElementById(`azkar-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titleKey="azkar.title" />

      <header className="mb-5 text-center text-[var(--color-card)]">
        <p className="text-sm leading-6 text-white/80">{t("azkar.subtitle")}</p>
        <p className="mt-2 text-sm font-bold text-[var(--color-gold-soft)]">
          {t("azkar.categoryStatus", {
            category: localizedCategory,
            completed: completedCount,
            total: totalCount,
          })}
        </p>
      </header>

      <div className="grid gap-5">
        <AzkarCategoryChips
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <section className="card overflow-hidden p-4 sm:p-5" aria-labelledby="azkar-progress-title">
          {completedCount > 0 ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[var(--color-emerald-soft)] p-3 text-[var(--color-emerald)]">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-extrabold">
                  {completedCount === totalCount
                    ? t("azkar.categoryCompleted", { category: localizedCategory })
                    : t("azkar.continueCategory", { category: localizedCategory })}
                </p>
                <p className="text-xs font-bold opacity-70">
                  {completedCount} / {totalCount}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex items-end justify-between gap-4">
            <div>
              <p id="azkar-progress-title" className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-gold-dark)]">
                {t("azkar.dailyProgress")}
              </p>
              <p className="mt-1 font-bold text-[var(--color-emerald)]">
                {t("azkar.progressSummary", { completed: completedCount, total: totalCount })}
              </p>
            </div>
            <p className="text-2xl font-extrabold text-[var(--color-emerald)]">{Math.round(progressPercent)}%</p>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--color-cream-deep)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-valuenow={completedCount}
            aria-label={t("azkar.dailyProgress")}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dark)] to-[var(--color-gold)] transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        <section aria-labelledby="azkar-routine-title">
          <SectionTitle>
            <span id="azkar-routine-title">{t("azkar.routine")}</span>
          </SectionTitle>
          <div className="grid gap-4">
            {categoryItems.map((item, index) => (
              <AzkarCard
                key={item.id}
                item={item}
                sequence={index + 1}
                count={Math.min(counts[item.id] || 0, item.repeatCount)}
                isFavorite={favoriteIds.has(item.id)}
                onIncrement={() => incrementItem(item)}
                onReset={() => resetItem(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="azkar-favorites-title">
          <SectionTitle>
            <span id="azkar-favorites-title">{t("azkar.favorites")}</span>
          </SectionTitle>
          <FavoriteAzkarList items={favoriteItems} onSelect={openFavorite} />
        </section>

        <section aria-labelledby="azkar-tasbeeh-title">
          <SectionTitle>
            <span id="azkar-tasbeeh-title">{t("azkar.tasbeeh")}</span>
          </SectionTitle>
          <TasbeehCounter />
        </section>
      </div>
    </div>
  );
}
