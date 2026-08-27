"use client";

import Link from "next/link";
import { ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataError, DataLoading } from "@/components/ui/DataState";
import { getMosqueSettings } from "@/lib/data/mosque-settings";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { safeEmailHref, safeExternalUrl, safeTelephoneHref } from "@/lib/public-links";

export default function MosquePage() {
  const { t, locale } = useTranslation();
  const { data: settings, error, loading, reload } = useAsyncData(getMosqueSettings);
  const mosqueName = settings ? getLocalizedField(settings, "mosqueName", locale) || settings.mosqueName : "";
  const mapsHref = safeExternalUrl(settings?.googleMapsLink, "maps");
  const whatsappHref = safeExternalUrl(settings?.whatsappLink, "whatsapp");
  const telephoneHref = safeTelephoneHref(settings?.phone);
  const emailHref = safeEmailHref(settings?.email);

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
            {mapsHref ? (
              <a className="mosque-contact-row" href={mapsHref} target="_blank" rel="noreferrer">
                <MapPin className="h-5 w-5" aria-hidden="true" />
                <span>{settings.address}</span>
                <ChevronRight className="h-4 w-4 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
              </a>
            ) : (
              <div className="mosque-contact-row">
                <MapPin className="h-5 w-5" aria-hidden="true" />
                <span>{settings.address}</span>
              </div>
            )}
            {telephoneHref ? (
              <a className="mosque-contact-row" href={telephoneHref}>
                <Phone className="h-5 w-5" aria-hidden="true" />
                <span>{settings.phone}</span>
                <ChevronRight className="h-4 w-4 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
            {emailHref ? (
              <a className="mosque-contact-row" href={emailHref}>
                <Mail className="h-5 w-5" aria-hidden="true" />
                <span className="break-all">{settings.email}</span>
                <ChevronRight className="h-4 w-4 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
            {mapsHref ? (
              <a className="mosque-action-row" href={mapsHref} target="_blank" rel="noreferrer">
                <MapPin className="h-5 w-5" aria-hidden="true" />
                <span>{t("mosque.googleMaps")}</span>
                <ChevronRight className="h-4 w-4 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
            {whatsappHref ? (
              <a className="mosque-action-row" href={whatsappHref} target="_blank" rel="noreferrer">
                <WhatsAppIcon className="h-5 w-5 text-[var(--app-brand)]" />
                <span>{t("mosque.whatsapp")}</span>
                <ChevronRight className="h-4 w-4 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
              </a>
            ) : null}
          </section>

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
