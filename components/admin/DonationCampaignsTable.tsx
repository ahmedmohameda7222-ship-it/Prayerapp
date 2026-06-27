"use client";

import { memo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { DonationCampaign } from "@/lib/types";

export const DonationCampaignsTable = memo(function DonationCampaignsTable({
  campaigns,
  disabled,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleFeatured,
}: {
  campaigns: DonationCampaign[];
  disabled: boolean;
  onEdit: (campaign: DonationCampaign) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onToggleFeatured: (id: string, featured: boolean) => void;
}) {
  const { t, locale } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]"><tr>{["admin.title", "donations.target", "donations.collected", "admin.active", "admin.featured", "admin.actions"].map((key) => <th key={key} className="px-3 py-3">{t(key)}</th>)}</tr></thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-3"><p className="font-bold">{getLocalizedField(campaign, "title", locale)}</p><p className="text-xs text-[var(--color-muted)]">{getLocalizedField(campaign, "description", locale).slice(0, 40)}...</p></td>
              <td className="px-3 py-3">{campaign.targetAmount}€</td>
              <td className="px-3 py-3">{campaign.collectedAmount}€</td>
              <td className="px-3 py-3"><button onClick={() => onToggleActive(campaign.id, campaign.isActive)} disabled={disabled} className={`rounded-full px-2 py-1 text-xs font-bold ${campaign.isActive ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>{campaign.isActive ? t("admin.active") : t("admin.inactive")}</button></td>
              <td className="px-3 py-3"><button onClick={() => onToggleFeatured(campaign.id, campaign.isFeatured)} disabled={disabled} className={`rounded-full px-2 py-1 text-xs font-bold ${campaign.isFeatured ? "bg-[var(--color-gold)]/20 text-[var(--color-gold-dark)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>{campaign.isFeatured ? t("admin.featured") : "-"}</button></td>
              <td className="px-3 py-3"><div className="flex gap-1">
                <button onClick={() => onEdit(campaign)} disabled={disabled} aria-label={t("common.edit")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => onDelete(campaign.id)} disabled={disabled} aria-label={t("common.delete")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
