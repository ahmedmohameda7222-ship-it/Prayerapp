import type { AzkarItem } from "@/lib/types";

export function FavoriteAzkarList({ items }: { items: AzkarItem[] }) {
  return (
    <div className="grid gap-3">
      {items.slice(0, 2).map((item) => (
        <article key={item.id} className="card p-4">
          <p className="font-bold text-[var(--color-emerald)]">{item.transliteration}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{item.translationEn}</p>
        </article>
      ))}
    </div>
  );
}
