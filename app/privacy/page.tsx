"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { phase1Copy } from "@/lib/i18n/phase1-copy";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function PrivacyPage() {
  const { locale } = useTranslation();
  const copy = phase1Copy[locale];
  const items = [
    copy.privacyEmail,
    copy.privacySaved,
    copy.privacyReminders,
    copy.privacyPush,
    copy.privacyPurpose,
    copy.privacyGuest,
    copy.privacyDelete,
    copy.privacyDisable,
  ];

  return (
    <AppShell>
      <article className="mx-auto max-w-2xl py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-brand text-3xl font-semibold text-[var(--color-emerald)]">{copy.privacyTitle}</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{copy.privacyIntro}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <p key={item} className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm leading-6 text-[var(--color-charcoal)]">{item}</p>
          ))}
        </div>
        <Link href="/account" className="mt-5 inline-flex min-h-11 items-center font-bold text-[var(--color-emerald)]">{copy.account}</Link>
      </article>
    </AppShell>
  );
}
