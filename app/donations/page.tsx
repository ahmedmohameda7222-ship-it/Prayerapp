"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HeroCard } from "@/components/ui/HeroCard";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BankTransferCard } from "@/components/donations/BankTransferCard";
import { DonationCampaignCard } from "@/components/donations/DonationCampaignCard";
import { TransparencyCard } from "@/components/donations/TransparencyCard";
import { DataError, DataLoading } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDonationCampaigns, getDonationReport, getDonationSettings } from "@/lib/data/donations";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function DonationsPage() {
  const { t } = useTranslation();
  const { data, error, loading, reload } = useAsyncData(loadDonationPageData);
  const donationCampaigns = data?.campaigns || [];

  return (
    <AppShell>
      <PageHeader titleKey="donations.title" />
      <div className="grid gap-5">
        <HeroCard src="/assets/hero-donations-charity.png" desktopSrc="/assets/hero-donations-charity-desktop.png" alt={t("donations.heroAlt")} priority>
          <h2 className="font-brand text-4xl font-semibold">{t("donations.supportMasjid")}</h2>
          <p className="mt-3 max-w-sm text-base leading-7 text-white/86">{t("donations.supportMasjidDesc")}</p>
        </HeroCard>
        {loading ? <DataLoading /> : null}
        {error ? <DataError message={error} retry={reload} /> : null}
        {data ? <>
        <section>
          <SectionTitle>{t("donations.activeCampaigns")}</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            {donationCampaigns.map((campaign) => <DonationCampaignCard key={campaign.id} campaign={campaign} />)}
            {!donationCampaigns.length ? <EmptyState message={t("donations.noCampaigns")} /> : null}
          </div>
        </section>
        {data.settings ? <BankTransferCard settings={data.settings} /> : null}
        <section>
          <SectionTitle>{t("donations.transparency")}</SectionTitle>
          <TransparencyCard report={data.report} />
        </section>
        </> : null}
      </div>
    </AppShell>
  );
}

async function loadDonationPageData() {
  const [settingsResult, campaigns, report] = await Promise.allSettled([
    getDonationSettings(),
    getDonationCampaigns(),
    getDonationReport(),
  ]);
  const settings = settingsResult.status === "fulfilled" ? settingsResult.value : undefined;
  return { settings, campaigns: campaigns.status === "fulfilled" ? campaigns.value : [], report: report.status === "fulfilled" ? report.value : { month: "", monthlyNeed: 0, donationsReceived: 0, remaining: 0 } };
}
