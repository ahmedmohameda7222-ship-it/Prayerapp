"use client";

import { Compass } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function QiblaPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <PageHeader titleKey="qibla.title" />
      <Card className="py-12 text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-[var(--color-emerald)] text-[var(--color-gold)]">
          <Compass className="h-10 w-10" />
        </div>
        <h2 className="font-brand text-3xl text-[var(--color-emerald)]">{t("qibla.title")}</h2>
        <p className="mt-3 text-[var(--color-muted)]">{t("qibla.comingSoon")}</p>
      </Card>
    </AppShell>
  );
}
