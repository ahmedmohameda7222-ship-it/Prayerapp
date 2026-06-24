import { HandHeart } from "lucide-react";
import type { DonationCampaign } from "@/lib/types";
import { formatCurrency, percent } from "@/lib/format";

export function DonationCampaignCard({ campaign }: { campaign: DonationCampaign }) {
  const progress = percent(campaign.collectedAmount, campaign.targetAmount);
  return (
    <article className="card p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-emerald)] text-[var(--color-gold)]">
          <HandHeart className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--color-emerald)]">{campaign.title}</h3>
          <p className="text-sm leading-5 text-[var(--color-muted)]">{campaign.description}</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-border)]">
        <div className="h-2 rounded-full bg-[var(--color-emerald)]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-bold text-[var(--color-charcoal)]">{formatCurrency(campaign.collectedAmount)} collected</span>
        <span className="text-[var(--color-muted)]">Goal {formatCurrency(campaign.targetAmount)} · {progress}%</span>
      </div>
    </article>
  );
}
