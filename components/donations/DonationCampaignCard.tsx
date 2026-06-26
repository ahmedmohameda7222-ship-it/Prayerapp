"use client";

import { HandHeart } from "lucide-react";
import type { DonationCampaign } from "@/lib/types";
import { formatCurrency, percent } from "@/lib/format";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { useTranslation } from "@/lib/i18n/use-translation";

export function DonationCampaignCard({ campaign }: { campaign: DonationCampaign }) {
  const { t, locale } = useTranslation();
  const progress = percent(campaign.collectedAmount, campaign.targetAmount);
  const title = getLocalizedField(campaign, "title", locale);
  const description = getLocalizedField(campaign, "description", locale);

  return (
    <article className="card p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-emerald)] text-[var(--color-gold)]">
          <HandHeart className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--color-emerald)]">{title}</h3>
          <p className="text-sm leading-5 text-[var(--color-muted)]">{description}</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-border)]">
        <div className="h-2 rounded-full bg-[var(--color-emerald)]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-bold text-[var(--color-charcoal)]">
          {t("donations.collectedAmount", { amount: formatCurrency(campaign.collectedAmount, locale) })}
        </span>
        <span className="text-[var(--color-muted)]">
          {t("donations.goalAmount", { amount: formatCurrency(campaign.targetAmount, locale), progress })}
        </span>
      </div>
    </article>
  );
}
