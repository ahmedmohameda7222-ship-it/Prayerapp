"use client";

import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/use-translation";
import { safeExternalUrl } from "@/lib/public-links";

export function PayPalCard({ paypalLink, showUrl = true, home = false }: { paypalLink?: string; showUrl?: boolean; home?: boolean }) {
  const { t } = useTranslation();
  const paypalHref = safeExternalUrl(paypalLink, "paypal");
  if (!paypalHref) return null;

  const content = (
    <>
      <h3 className={home ? "text-base font-bold text-[var(--home-text)]" : "text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]"}>PayPal</h3>
      {home ? <p className="mt-2 text-sm leading-6 text-[var(--home-text-secondary)]">{t("phase1.paypalSupport")}</p> : null}
      {showUrl ? <p className="mt-2 break-all text-sm text-[var(--color-muted)]">{paypalHref}</p> : null}
      <a
        href={paypalHref}
        target="_blank"
        rel="noreferrer"
        className={home ? "mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--home-brand-strong)] px-4 py-2 text-sm font-bold transition-colors hover:bg-[var(--home-brand)]" : "mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-card)] shadow-[var(--shadow-card)] transition active:scale-[0.98]"}
        style={home ? { color: "#FCFAF6" } : undefined}
      >
        <span style={home ? { color: "#FCFAF6" } : undefined}>{t("donations.donateWithPaypal")}</span>
        <ExternalLink
          className="h-4 w-4"
          aria-hidden="true"
          style={home ? { color: "#FCFAF6", stroke: "#FCFAF6" } : undefined}
        />
      </a>
    </>
  );

  return home ? <section className="home-donation-surface p-4" data-testid="home-paypal-surface">{content}</section> : <Card>{content}</Card>;
}
