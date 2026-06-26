"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataError, DataLoading } from "@/components/ui/DataState";
import { getMosqueSettings } from "@/lib/data/mosque-settings";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";

export default function MosquePage() {
  const { t, locale } = useTranslation();
  const { data: settings, error, loading, reload } = useAsyncData(getMosqueSettings);
  const mosqueName = settings ? getLocalizedField(settings, "mosqueName", locale) || settings.mosqueName : "";
  const externalClass = "min-h-11 rounded-2xl border border-[var(--color-emerald)] px-4 py-3 text-center text-sm font-bold text-[var(--color-emerald)]";

  return (
    <AppShell>
      <PageHeader titleKey="mosque.title" />
      {loading ? <DataLoading /> : null}
      {error ? <DataError message={error} retry={reload} /> : null}
      {settings ? <div className="grid gap-5">
        <Card>
          <h2 className="font-brand text-3xl text-[var(--color-emerald)]">{mosqueName}</h2>
          <div className="mt-4 grid gap-3 text-sm font-bold text-[var(--color-charcoal)]">
            <p className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[var(--color-gold-dark)]" /> {settings.address}</p>
            <a className="flex items-center gap-2" href={`tel:${settings.phone}`}><Phone className="h-5 w-5 text-[var(--color-gold-dark)]" /> {settings.phone}</a>
            <a className="flex items-center gap-2" href={`mailto:${settings.email}`}><Mail className="h-5 w-5 text-[var(--color-gold-dark)]" /> {settings.email}</a>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {settings.googleMapsLink.startsWith("https://") ? <a className={externalClass} href={settings.googleMapsLink} target="_blank" rel="noreferrer">{t("mosque.googleMaps")}</a> : null}
            {settings.whatsappLink.startsWith("https://") ? <a className={externalClass} href={settings.whatsappLink} target="_blank" rel="noreferrer">{t("mosque.whatsapp")}</a> : null}
            {settings.telegramLink.startsWith("https://") ? <a className={externalClass} href={settings.telegramLink} target="_blank" rel="noreferrer">{t("mosque.telegram")}</a> : null}
          </div>
        </Card>
        <Card>
          <h2 className="font-bold text-[var(--color-emerald)]">{t("mosque.visitorInfo")}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{t("mosque.visitorInfoDesc")}</p>
        </Card>
        <Link href="/donations" className="card block p-4 font-bold text-[var(--color-emerald)]">{t("mosque.viewBankDetails")}</Link>
      </div> : null}
    </AppShell>
  );
}
