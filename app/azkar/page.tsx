"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { DataError, DataLoading } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AzkarCard } from "@/components/azkar/AzkarCard";
import { AzkarCategoryChips } from "@/components/azkar/AzkarCategoryChips";
import { FavoriteAzkarList } from "@/components/azkar/FavoriteAzkarList";
import { TasbeehCounter } from "@/components/azkar/TasbeehCounter";
import { getAzkarCategories, getAzkarItems } from "@/lib/data/azkar";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { AzkarCategory, AzkarItem } from "@/lib/types";

async function loadAzkar() {
  const [categories, items] = await Promise.all([getAzkarCategories(), getAzkarItems()]);
  return { categories, items };
}

export default function AzkarPage() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useAsyncData(loadAzkar);
  const [selectedCategory, setSelectedCategory] = useState<AzkarCategory>("Morning");
  const [activeItem, setActiveItem] = useState<AzkarItem | null>(null);
  const filtered = useMemo(() => (data?.items || []).filter((item) => item.category === selectedCategory), [data, selectedCategory]);
  const featured = filtered[0];

  function selectCategory(category: AzkarCategory) {
    setSelectedCategory(category);
    setActiveItem(null);
  }

  return (
    <AppShell>
      <PageHeader titleKey="azkar.title" />
      {loading ? <DataLoading /> : null}
      {error ? <DataError message={error} retry={reload} /> : null}
      {data ? <div className="grid gap-5">
        <AzkarCategoryChips categories={data.categories} selected={selectedCategory} onSelect={selectCategory} />
        {featured ? <section><SectionTitle>{t("azkar.featured")}</SectionTitle><AzkarCard item={featured} onStart={setActiveItem} /></section> : <EmptyState message={t("azkar.empty")} />}
        {activeItem ? <section><SectionTitle>{t("azkar.tasbeeh")}</SectionTitle><TasbeehCounter key={activeItem.id} name={activeItem.transliteration} target={activeItem.repeatCount} /></section> : null}
        {filtered.length > 1 ? <section><SectionTitle>{t("azkar.moreInCategory")}</SectionTitle><FavoriteAzkarList items={filtered.slice(1)} onSelect={setActiveItem} /></section> : null}
      </div> : null}
    </AppShell>
  );
}
