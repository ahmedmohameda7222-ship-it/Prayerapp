import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { AzkarCard } from "@/components/azkar/AzkarCard";
import { AzkarCategoryChips } from "@/components/azkar/AzkarCategoryChips";
import { FavoriteAzkarList } from "@/components/azkar/FavoriteAzkarList";
import { TasbeehCounter } from "@/components/azkar/TasbeehCounter";
import { azkarCategories, azkarItems } from "@/lib/mock-data";

export default function AzkarPage() {
  const featured = azkarItems[0];
  return (
    <AppShell>
      <PageHeader title="Azkar & Duaa" />
      <div className="grid gap-5">
        <AzkarCategoryChips categories={azkarCategories} />
        <section>
          <SectionTitle>Featured Azkar</SectionTitle>
          <AzkarCard item={featured} />
        </section>
        <section>
          <SectionTitle>Tasbeeh Counter</SectionTitle>
          <TasbeehCounter name={azkarItems[1].transliteration} target={azkarItems[1].repeatCount} />
        </section>
        <section>
          <SectionTitle>Favorites</SectionTitle>
          <FavoriteAzkarList items={azkarItems.slice(1)} />
        </section>
      </div>
    </AppShell>
  );
}
