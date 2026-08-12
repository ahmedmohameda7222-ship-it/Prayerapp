"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { DonationSettings } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";

export function BankTransferCard({ settings, home = false }: { settings: DonationSettings; home?: boolean }) {
  const { t, locale } = useTranslation();
  const [copied, setCopied] = useState("");
  const defaultPurpose = getLocalizedField(settings, "defaultPurpose", locale) || settings.defaultPurpose;
  const rows: [string, string, string][] = [
    [t("donations.accountHolder"), settings.accountHolder, "accountHolder"],
    [t("donations.iban"), settings.iban, "iban"],
    [t("donations.bic"), settings.bic, "bic"],
    [t("donations.reference"), defaultPurpose, "reference"],
  ];
  const visibleRows = rows.filter(([, value]) => Boolean(value));

  if (!visibleRows.length) return null;

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
    } catch {
      setCopied("error");
    }
    window.setTimeout(() => setCopied(""), 1600);
  }

  const content = (
    <>
      <h2 className={home ? "mb-3 text-base font-bold text-[var(--home-text)]" : "mb-3 text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]"}>{t("donations.bankTransfer")}</h2>
      <div className={home ? "divide-y divide-[var(--home-divider)]" : "grid gap-2"} data-testid={home ? "home-bank-surface" : undefined}>
        {visibleRows.map(([label, value, key]) => (
          <div key={key} className={home ? "grid grid-cols-[1fr_44px] gap-3 py-3 first:pt-0 last:pb-0" : "grid grid-cols-[1fr_44px] gap-3 rounded-2xl bg-[var(--color-cream)] p-3"}>
            <div>
              <p className={home ? "text-xs font-semibold text-[var(--home-text-secondary)]" : "text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-muted)]"}>{label}</p>
              <p className={home ? "break-words font-semibold text-[var(--home-text)]" : "break-words font-bold text-[var(--color-charcoal)]"}>{value}</p>
              {copied === key ? <p role="status" className={home ? "mt-1 text-xs font-bold text-[var(--home-success)]" : "mt-1 text-xs font-extrabold text-[var(--color-emerald)]"}>{t("donations.copied")}</p> : null}
            </div>
            <button
              aria-label={`${t("donations.copy")} ${label}`}
              onClick={() => copy(value, key)}
              className={home ? "grid h-11 w-11 place-items-center rounded-[10px] border border-[var(--home-divider)] bg-white text-[var(--home-brand)]" : "grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-emerald)] text-[var(--color-card)]"}
            >
              {copied === key ? <Check className={home ? "h-5 w-5 text-[var(--home-success)]" : "h-5 w-5 text-[var(--color-gold-dark)]"} aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        ))}
      </div>
    </>
  );

  return home ? <section className="border-y border-[var(--home-divider)] py-4">{content}</section> : <Card>{content}</Card>;
}
