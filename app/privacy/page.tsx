"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function PrivacyPage() {
  const { t } = useTranslation();
  const items = [
    t("phase1.privacyEmail"),
    t("phase1.privacySaved"),
    t("phase1.privacyReminders"),
    t("phase1.privacyPush"),
    t("phase1.privacyPurpose"),
    t("phase1.privacyGuest"),
    t("phase1.privacyDelete"),
    t("phase1.privacyDisable"),
  ];

  return (
    <AppShell>
      <article className="mx-auto max-w-2xl py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-brand text-3xl font-semibold text-[var(--color-emerald)]">{t("phase1.privacyTitle")}</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{t("phase1.privacyIntro")}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <p key={item} className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm leading-6 text-[var(--color-charcoal)]">{item}</p>
          ))}
        </div>
        <Link href="/account" className="mt-5 inline-flex min-h-11 items-center font-bold text-[var(--color-emerald)]">{t("phase1.account")}</Link>
      </article>
    </AppShell>
  );
}
