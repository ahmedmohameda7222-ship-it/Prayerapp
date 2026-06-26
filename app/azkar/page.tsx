"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { AzkarCard } from "@/components/azkar/AzkarCard";
import { AzkarCategoryChips } from "@/components/azkar/AzkarCategoryChips";
import { FavoriteAzkarList } from "@/components/azkar/FavoriteAzkarList";
import { TasbeehCounter } from "@/components/azkar/TasbeehCounter";
import { azkarCategories, azkarItems } from "@/lib/mock-data";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function AzkarPage() {
  const { t } = useTranslation();
  const featured = azkarItems[0];
  return (
    <AppShell>
      <PageHeader titleKey="azkar.title" />
      <div className="grid gap-5">
        <AzkarCategoryChips categories={azkarCategories} />
        <section>
          <SectionTitle>{t("azkar.featured")}</SectionTitle>
          <AzkarCard item={featured} />
        </section>
        <section>
          <SectionTitle>{t("azkar.tasbeeh")}</SectionTitle>
          <TasbeehCounter name={azkarItems[1].transliteration} target={azkarItems[1].repeatCount} />
        </section>
        <section>
          <SectionTitle>{t("azkar.favorites")}</SectionTitle>
          <FavoriteAzkarList items={azkarItems.slice(1)} />
        </section>
      </div>
    </AppShell>
  );
}
