"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { mosqueSettings } from "@/lib/mock-data";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";

const facilityKeys = [
  "mosque.placeForWomen",
  "mosque.wuduArea",
  "mosque.parkingNotes",
  "mosque.communityLinks",
] as const;

export default function MosquePage() {
  const { t, locale } = useTranslation();
  const mosqueName = getLocalizedField(mosqueSettings, "mosqueName", locale) || mosqueSettings.mosqueName;

  return (
    <AppShell>
      <PageHeader titleKey="mosque.title" />
      <div className="grid gap-5">
        <Card>
          <h2 className="font-brand text-3xl text-[var(--color-emerald)]">{mosqueName}</h2>
          <div className="mt-4 grid gap-3 text-sm font-bold text-[var(--color-charcoal)]">
            <p className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[var(--color-gold-dark)]" /> {mosqueSettings.address}</p>
            <p className="flex items-center gap-2"><Phone className="h-5 w-5 text-[var(--color-gold-dark)]" /> {mosqueSettings.phone}</p>
            <p className="flex items-center gap-2"><Mail className="h-5 w-5 text-[var(--color-gold-dark)]" /> {mosqueSettings.email}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button>{t("mosque.googleMaps")}</Button>
            <Button variant="ghost">{t("mosque.whatsapp")}</Button>
            <Button variant="ghost">{t("mosque.telegram")}</Button>
          </div>
        </Card>
        <section>
          <SectionTitle>{t("mosque.facilities")}</SectionTitle>
          <div className="grid gap-3">
            {facilityKeys.map((key) => (
              <Card key={key}><p className="font-bold text-[var(--color-emerald)]">{t(key)}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{t("mosque.facilityPlaceholder")}</p></Card>
            ))}
          </div>
        </section>
        <Link href="/donations" className="card block p-4 font-bold text-[var(--color-emerald)]">{t("mosque.viewBankDetails")}</Link>
      </div>
    </AppShell>
  );
}
