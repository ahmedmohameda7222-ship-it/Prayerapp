"use client";

import Link from "next/link";
import { ChevronRight, Mail, MapPin, Phone } from "lucide-react";
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

  return (
    <AppShell>
      <PageHeader titleKey="mosque.title" backHref="/more" />
      {loading ? <DataLoading /> : null}
      {error ? <DataError message={error} retry={reload} /> : null}
      {settings ? (
        <div className="grid gap-4">
          <section className="mosque-profile">
            <div className="mosque-profile-identity">
              <h2 className="mosque-profile-name">{mosqueName}</h2>
            </div>
            <div className="mosque-contact-row">
              <MapPin className="h-5 w-5" aria-hidden="true" />
              <span>{settings.address}</span>
            </div>
            {settings.phone ? (
              <a className="mosque-contact-row" href={`tel:${settings.phone}`}>
                <Phone className="h-5 w-5" aria-hidden="true" />
                <span>{settings.phone}</span>
                <ChevronRight className="h-4 w-4 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
            {settings.email ? (
              <a className="mosque-contact-row" href={`mailto:${settings.email}`}>
                <Mail className="h-5 w-5" aria-hidden="true" />
                <span className="break-all">{settings.email}</span>
                <ChevronRight className="h-4 w-4 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
            {settings.googleMapsLink.startsWith("https://") ? (
              <a className="mosque-action-row" href={settings.googleMapsLink} target="_blank" rel="noreferrer">
                <MapPin className="h-5 w-5" aria-hidden="true" />
                <span>{t("mosque.googleMaps")}</span>
                <ChevronRight className="h-4 w-4 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
            {settings.whatsappLink.startsWith("https://") ? (
              <a className="mosque-action-row" href={settings.whatsappLink} target="_blank" rel="noreferrer">
                <span className="grid h-5 w-5 place-items-center text-xs font-extrabold text-[var(--app-brand)]" aria-hidden="true">W</span>
                <span>{t("mosque.whatsapp")}</span>
                <ChevronRight className="h-4 w-4 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
            {settings.telegramLink.startsWith("https://") ? (
              <a className="mosque-action-row" href={settings.telegramLink} target="_blank" rel="noreferrer">
                <span className="grid h-5 w-5 place-items-center text-xs font-extrabold text-[var(--app-brand)]" aria-hidden="true">T</span>
                <span>{t("mosque.telegram")}</span>
                <ChevronRight className="h-4 w-4 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
          </section>

          <Card>
            <h2 className="text-[15px] font-bold text-[var(--app-text)]">{t("mosque.visitorInfo")}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--app-text-secondary)]">{t("mosque.visitorInfoDesc")}</p>
          </Card>

          <Link href="/donations" className="native-list-row rounded-[16px] border border-[var(--app-divider)] bg-[var(--app-surface)]">
            <span className="native-list-row-icon" aria-hidden="true">€</span>
            <span className="native-list-row-title">{t("mosque.viewBankDetails")}</span>
            <ChevronRight className="native-list-row-chevron h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </AppShell>
  );
}
