"use client";

import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/use-translation";

export function PayPalCard({ paypalLink, showUrl = true }: { paypalLink?: string; showUrl?: boolean }) {
  const { t } = useTranslation();
  if (!paypalLink) return null;

  return (
    <Card>
      <h3 className="text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]">PayPal</h3>
      {showUrl ? <p className="mt-2 break-all text-sm text-[var(--color-muted)]">{paypalLink}</p> : null}
      <a
        href={paypalLink}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-card)] shadow-[var(--shadow-card)] transition active:scale-[0.98]"
      >
        {t("donations.donateWithPaypal")}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </Card>
  );
}
