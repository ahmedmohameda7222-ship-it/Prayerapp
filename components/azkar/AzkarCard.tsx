"use client";

import type { AzkarItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedAzkarTranslation } from "@/lib/i18n/localized-content";

export function AzkarCard({ item }: { item: AzkarItem }) {
  const { t, locale } = useTranslation();
  const translation = getLocalizedAzkarTranslation(item, locale);

  return (
    <section className="patterned rounded-[24px] bg-gradient-to-br from-[var(--color-emerald-dark)] to-[var(--color-emerald)] p-5 text-[var(--color-card)] shadow-[var(--shadow-card)]">
      <div className="relative z-10">
        <p className="mb-4 text-center text-[28px] leading-[1.9]" dir="rtl">{item.arabicText}</p>
        <p className="text-center text-sm leading-6 text-white/80">{item.transliteration}</p>
        {translation ? <p className="mt-3 text-center text-base leading-7">{translation}</p> : null}
        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-gold)]">{t("azkar.repeatCount", { count: item.repeatCount })}</p>
            <p className="text-sm text-white/70">{item.source}</p>
          </div>
          <Button variant="gold">{t("azkar.startDhikr")}</Button>
        </div>
      </div>
    </section>
  );
}
