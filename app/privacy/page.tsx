"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
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
      <article className="privacy-screen">
        <PageHeader titleKey="phase1.privacyTitle" backHref="/more" />
        <p className="privacy-intro">{t("phase1.privacyIntro")}</p>
        <div className="privacy-body">
          {items.map((item) => <p key={item}>{item}</p>)}
        </div>
        <Link href="/account" className="mt-7 inline-flex min-h-11 items-center font-semibold text-[var(--app-brand)]">
          {t("phase1.account")}
        </Link>
      </article>
    </AppShell>
  );
}
