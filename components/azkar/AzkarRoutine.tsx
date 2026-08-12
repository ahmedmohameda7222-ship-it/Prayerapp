"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LogIn } from "lucide-react";
import { AzkarCard } from "@/components/azkar/AzkarCard";
import { AzkarCategoryChips, type AzkarTab } from "@/components/azkar/AzkarCategoryChips";
import { TasbeehCounter } from "@/components/azkar/TasbeehCounter";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useSavedAzkar } from "@/lib/hooks/use-saved-azkar";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { AzkarCategory, AzkarItem } from "@/lib/types";

const PROGRESS_KEY = "azkar_progress_v1";

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
    if (!raw) return { date: today, lastSelectedCategory: fallbackCategory, counts: {} };
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

function readRequestedTab(categories: AzkarCategory[]): AzkarTab | undefined {
  const requested = new URLSearchParams(window.location.search).get("tab");
  if (requested === "Favorites") return "Favorites";
  return isCategory(requested, categories) ? requested : undefined;
}

export function AzkarRoutine({ categories, items }: { categories: AzkarCategory[]; items: AzkarItem[] }) {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<AzkarTab>("Morning");
  const [lastRealCategory, setLastRealCategory] = useState<AzkarCategory>("Morning");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const [favoriteSaveError, setFavoriteSaveError] = useState(false);
  const validIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const { user, favoriteIds, loaded: favoritesLoaded, error: favoritesLoadError, setSaved } = useSavedAzkar(validIds);

  /* eslint-disable react-hooks/set-state-in-effect -- localStorage is only available after mount. */
  useEffect(() => {
    const stored = readStoredProgress(categories);
    const requestedTab = readRequestedTab(categories);
    const initialTab = requestedTab || stored.lastSelectedCategory;
    setSelectedTab(initialTab);
    if (initialTab !== "Favorites") setLastRealCategory(initialTab);
    setCounts(stored.counts);
    setHydrated(true);
  }, [categories]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    const progress: StoredProgress = {
      date: localDateKey(new Date()),
      lastSelectedCategory: lastRealCategory,
      counts,
    };
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Daily counting remains usable even if local storage is unavailable.
    }
  }, [counts, hydrated, lastRealCategory]);

  useEffect(() => {
    if (!hydrated || !favoritesLoaded || !user) return;
    const url = new URL(window.location.href);
    const requestedSave = url.searchParams.get("save");
    if (!requestedSave || !validIds.has(requestedSave)) return;

    const completeRequestedSave = async () => {
      if (!favoriteIds.has(requestedSave)) {
        const result = await setSaved(requestedSave, true);
        if (result === "error") {
          setFavoriteSaveError(true);
          return;
        }
      }
      url.searchParams.delete("save");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      setSelectedTab("Favorites");
    };
    void completeRequestedSave();
  }, [favoriteIds, favoritesLoaded, hydrated, setSaved, user, validIds]);

  const visibleItems = useMemo(
    () => selectedTab === "Favorites"
      ? items.filter((item) => favoriteIds.has(item.id))
      : items.filter((item) => item.category === selectedTab),
    [favoriteIds, items, selectedTab]
  );
  const completedCount = useMemo(
    () => visibleItems.filter((item) => (counts[item.id] || 0) >= item.repeatCount).length,
    [counts, visibleItems]
  );
  const totalCount = visibleItems.length;
  const progressPercent = totalCount ? (completedCount / totalCount) * 100 : 0;
  const localizedTab = selectedTab === "Favorites" ? t("azkar.favorites") : t(`azkarCategories.${selectedTab}`);

  const incrementItem = useCallback((item: AzkarItem) => {
    setCounts((current) => ({
      ...current,
      [item.id]: Math.min((current[item.id] || 0) + 1, item.repeatCount),
    }));
  }, []);

  const resetItem = useCallback((id: string) => {
    setCounts((current) => ({ ...current, [id]: 0 }));
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    setFavoriteSaveError(false);
    if (!user) {
      const next = `/azkar?tab=Favorites&save=${encodeURIComponent(id)}#azkar-${encodeURIComponent(id)}`;
      window.location.assign(`/account/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }
    const result = await setSaved(id, !favoriteIds.has(id));
    if (result === "error") setFavoriteSaveError(true);
  }, [favoriteIds, setSaved, user]);

  function selectTab(tab: AzkarTab) {
    setSelectedTab(tab);
    if (tab !== "Favorites") setLastRealCategory(tab);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titleKey="azkar.title" />

      <header className="mb-5 text-center text-[var(--color-card)]">
        <p className="text-sm leading-6 text-white/80">{t("azkar.subtitle")}</p>
        <p className="mt-2 text-sm font-bold text-[var(--color-gold-soft)]">
          {t(selectedTab === "Favorites" ? "azkar.favoritesStatus" : "azkar.categoryStatus", {
            category: localizedTab,
            completed: completedCount,
            total: totalCount,
          })}
        </p>
      </header>

      <div className="grid gap-5">
        <AzkarCategoryChips categories={categories} selected={selectedTab} onSelect={selectTab} />

        {selectedTab === "Favorites" && !user ? (
          <a href="/account/sign-in?next=%2Fazkar%3Ftab%3DFavorites" className="card flex min-h-14 items-center gap-3 p-4 font-bold text-[var(--color-emerald)]">
            <LogIn className="h-5 w-5" aria-hidden="true" />
            {t("phase1.accountRequired")}
          </a>
        ) : null}
        {favoriteSaveError || favoritesLoadError ? (
          <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-800">{t("phase1.authError")}</p>
        ) : null}

        <section className="card overflow-hidden p-4 sm:p-5" aria-labelledby="azkar-progress-title">
          {completedCount > 0 ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[var(--color-emerald-soft)] p-3 text-[var(--color-emerald)]">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-extrabold">
                  {completedCount === totalCount
                    ? t(selectedTab === "Favorites" ? "azkar.favoritesCompleted" : "azkar.categoryCompleted", { category: localizedTab })
                    : t(selectedTab === "Favorites" ? "azkar.continueFavorites" : "azkar.continueCategory", { category: localizedTab })}
                </p>
                <p className="text-xs font-bold opacity-70">{completedCount} / {totalCount}</p>
              </div>
            </div>
          ) : null}

          <div className="flex items-end justify-between gap-4">
            <div>
              <p id="azkar-progress-title" className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-gold-dark)]">{t("azkar.dailyProgress")}</p>
              <p className="mt-1 font-bold text-[var(--color-emerald)]">{t("azkar.progressSummary", { completed: completedCount, total: totalCount })}</p>
            </div>
            <p className="text-2xl font-extrabold text-[var(--color-emerald)]">{Math.round(progressPercent)}%</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--color-cream-deep)]" role="progressbar" aria-valuemin={0} aria-valuemax={Math.max(totalCount, 1)} aria-valuenow={completedCount} aria-label={t("azkar.dailyProgress")}>
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dark)] to-[var(--color-gold)] transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </section>

        <section aria-labelledby="azkar-routine-title">
          <SectionTitle><span id="azkar-routine-title">{selectedTab === "Favorites" ? t("azkar.favorites") : t("azkar.routine")}</span></SectionTitle>
          <div className="grid gap-4">
            {visibleItems.map((item, index) => (
              <AzkarCard
                key={item.id}
                item={item}
                sequence={index + 1}
                count={Math.min(counts[item.id] || 0, item.repeatCount)}
                isFavorite={favoriteIds.has(item.id)}
                onIncrement={() => incrementItem(item)}
                onReset={() => resetItem(item.id)}
                onToggleFavorite={() => void toggleFavorite(item.id)}
              />
            ))}
            {visibleItems.length === 0 ? (
              <div className="card border-dashed p-6 text-center text-sm text-[var(--color-muted)]">
                {t(selectedTab === "Favorites" ? "azkar.noFavorites" : "azkar.empty")}
              </div>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="azkar-tasbeeh-title">
          <SectionTitle><span id="azkar-tasbeeh-title">{t("azkar.tasbeeh")}</span></SectionTitle>
          <TasbeehCounter />
        </section>
      </div>
    </div>
  );
}
