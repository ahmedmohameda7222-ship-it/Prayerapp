import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HeroCard } from "@/components/ui/HeroCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BankTransferCard } from "@/components/donations/BankTransferCard";
import { DonationCampaignCard } from "@/components/donations/DonationCampaignCard";
import { TransparencyCard } from "@/components/donations/TransparencyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getDonationCampaigns,
  getDonationReport,
  getDonationSettings,
} from "@/lib/data/donations";
import { getServerLocale, getTranslation } from "@/lib/i18n/server-translation";

export default async function DonationsPage() {
  const locale = await getServerLocale();
  const { t } = getTranslation(locale);
  const [settingsResult, campaigns, report] = await Promise.allSettled([
    getDonationSettings(),
    getDonationCampaigns(),
    getDonationReport(),
  ]);
  const settings = settingsResult.status === "fulfilled" ? settingsResult.value : undefined;
  const donationCampaigns = campaigns.status === "fulfilled" ? campaigns.value : [];
  const donationReport = report.status === "fulfilled" ? report.value : { month: "", monthlyNeed: 0, donationsReceived: 0, remaining: 0 };

  return (
    <AppShell>
      <PageHeader titleKey="donations.title" />
      <div className="grid gap-5">
        <HeroCard
          src="/assets/hero-donations-charity.png"
          desktopSrc="/assets/hero-donations-charity-desktop.png"
          alt={t("donations.heroAlt")}
        >
          <h2 className="font-brand text-4xl font-semibold">{t("donations.supportMasjid")}</h2>
          <p className="mt-3 max-w-sm text-base leading-7 text-white/86">{t("donations.supportMasjidDesc")}</p>
        </HeroCard>
        <section>
          <SectionTitle>{t("donations.activeCampaigns")}</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            {donationCampaigns.map((campaign) => (
              <DonationCampaignCard key={campaign.id} campaign={campaign} />
            ))}
            {!donationCampaigns.length ? <EmptyState message={t("donations.noCampaigns")} /> : null}
          </div>
        </section>
        {settings ? <BankTransferCard settings={settings} /> : null}
        <section>
          <SectionTitle>{t("donations.transparency")}</SectionTitle>
          <TransparencyCard report={donationReport} />
        </section>
      </div>
    </AppShell>
  );
}
