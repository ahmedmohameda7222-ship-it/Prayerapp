"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function PrivacyPage() {
  const { t } = useTranslation();
  const items = [
    t("privacy.accountData"),
    t("privacy.savedAzkar"),
    t("privacy.reminders"),
    t("privacy.pushData"),
    t("privacy.dataPurpose"),
    t("privacy.guestAccess"),
    t("privacy.deleteAccount"),
    t("privacy.disableNotifications"),
  ];

  return (
    <AppShell>
      <article className="mx-auto max-w-2xl py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-brand text-3xl font-semibold text-[var(--color-emerald)]">{t("privacy.phase1Title")}</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{t("privacy.intro")}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <p key={item} className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm leading-6 text-[var(--color-charcoal)]">{item}</p>
          ))}
        </div>
        <Link href="/account" className="mt-5 inline-flex min-h-11 items-center font-bold text-[var(--color-emerald)]">{t("account.title")}</Link>
      </article>
    </AppShell>
  );
}
