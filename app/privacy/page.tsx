"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function PrivacyPage() {
  const { t } = useTranslation();
  return <AppShell><PageHeader titleKey="privacy.title" /><div className="grid gap-4">
    {["controller", "data", "purpose", "retention", "rights", "contact"].map((section) => <Card key={section}><h2 className="font-bold text-[var(--color-emerald)]">{t(`privacy.${section}Title`)}</h2><p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{t(`privacy.${section}Text`)}</p></Card>)}
    <p className="text-xs text-[var(--color-muted)]">{t("privacy.reviewNotice")}</p>
  </div></AppShell>;
}
