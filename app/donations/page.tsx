"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HeroCard } from "@/components/ui/HeroCard";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BankTransferCard } from "@/components/donations/BankTransferCard";
import { DonationCampaignCard } from "@/components/donations/DonationCampaignCard";
import { QuickDonateButtons } from "@/components/donations/QuickDonateButtons";
import { TransparencyCard } from "@/components/donations/TransparencyCard";
import { donationCampaigns, donationReport, donationSettings } from "@/lib/mock-data";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function DonationsPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <PageHeader titleKey="donations.title" />
      <div className="grid gap-5">
        <HeroCard src="/assets/hero-donations-charity.png" alt={t("donations.heroAlt")} priority>
          <h2 className="font-brand text-4xl font-semibold">{t("donations.supportMasjid")}</h2>
          <p className="mt-3 max-w-sm text-base leading-7 text-white/86">{t("donations.supportMasjidDesc")}</p>
        </HeroCard>
        <section>
          <SectionTitle>{t("donations.quickDonate")}</SectionTitle>
          <QuickDonateButtons />
        </section>
        <section>
          <SectionTitle>{t("donations.activeCampaigns")}</SectionTitle>
          <div className="grid gap-3">
            {donationCampaigns.map((campaign) => <DonationCampaignCard key={campaign.id} campaign={campaign} />)}
          </div>
        </section>
        <BankTransferCard settings={donationSettings} />
        <section>
          <SectionTitle>{t("donations.transparency")}</SectionTitle>
          <TransparencyCard report={donationReport} />
        </section>
        <Card>
          <h2 className="font-bold text-[var(--color-emerald)]">{t("donations.receiptRequest")}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{t("donations.receiptRequestDesc")}</p>
        </Card>
      </div>
    </AppShell>
  );
}
