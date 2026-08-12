"use client";

import { HandHeart } from "lucide-react";
import type { DonationCampaign } from "@/lib/types";
import { formatCurrency, percent } from "@/lib/format";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { useTranslation } from "@/lib/i18n/use-translation";

export function DonationCampaignCard({ campaign, home = false }: { campaign: DonationCampaign; home?: boolean }) {
  const { t, locale } = useTranslation();
  const progress = percent(campaign.collectedAmount, campaign.targetAmount);
  const title = getLocalizedField(campaign, "title", locale);
  const description = getLocalizedField(campaign, "description", locale);

  if (home) {
    return (
      <article className="border-b border-[var(--home-divider)] pb-5">
        <h3 className="font-bold text-[var(--home-text)]">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-[var(--home-text-secondary)]">{description}</p>
        <div
          className="mt-4 h-1 overflow-hidden rounded-[2px] bg-[var(--home-divider)]"
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-1 rounded-[2px] bg-[var(--home-brand)]" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-[var(--home-text)]">
            {t("donations.collectedAmount", { amount: formatCurrency(campaign.collectedAmount, locale) })}
          </span>
          <span className="text-[var(--home-text-secondary)]">
            {t("donations.goalAmount", { amount: formatCurrency(campaign.targetAmount, locale), progress })}
          </span>
        </div>
      </article>
    );
  }

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
