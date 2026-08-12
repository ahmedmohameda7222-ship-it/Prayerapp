"use client";

import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/use-translation";

export function PayPalCard({ paypalLink, showUrl = true, home = false }: { paypalLink?: string; showUrl?: boolean; home?: boolean }) {
  const { t } = useTranslation();
  if (!paypalLink) return null;

  const content = (
    <>
      <h3 className={home ? "text-base font-bold text-[var(--home-text)]" : "text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]"}>PayPal</h3>
      {home ? <p className="mt-2 text-sm leading-6 text-[var(--home-text-secondary)]">{t("phase1.paypalSupport")}</p> : null}
      {showUrl ? <p className="mt-2 break-all text-sm text-[var(--color-muted)]">{paypalLink}</p> : null}
      <a
        href={paypalLink}
        target="_blank"
        rel="noreferrer"
        className={home ? "mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--home-brand)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--home-brand-strong)]" : "mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-card)] shadow-[var(--shadow-card)] transition active:scale-[0.98]"}
      >
        {t("donations.donateWithPaypal")}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </>
  );

  return home ? <section className="border-b border-[var(--home-divider)] pb-5">{content}</section> : <Card>{content}</Card>;
}
