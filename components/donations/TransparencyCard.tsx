"use client";

import type { DonationReport } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/use-translation";

export function TransparencyCard({ report, home = false }: { report: DonationReport; home?: boolean }) {
  const { t, locale } = useTranslation();
  const rows = [
    [t("donations.monthlyNeed"), report.monthlyNeed],
    [t("donations.donationsReceived"), report.donationsReceived],
    [t("donations.remaining"), report.remaining],
  ];

  if (home) {
    return (
      <section
        className="home-donation-surface divide-y divide-[var(--home-divider)]"
        data-testid="home-transparency-surface"
      >
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm font-semibold text-[var(--home-text-secondary)]">{label}</p>
            <p className="shrink-0 text-base font-bold text-[var(--home-brand-strong)]">
              {formatCurrency(value as number, locale)}
            </p>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="card p-4">
          <p className="text-xs font-bold uppercase text-[var(--color-muted)]">{label}</p>
          <p className="mt-1 text-xl font-extrabold text-[var(--color-emerald)]">{formatCurrency(value as number, locale)}</p>
        </div>
      ))}
    </section>
  );
}
