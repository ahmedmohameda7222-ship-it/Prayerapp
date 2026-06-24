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

export default function DonationsPage() {
  return (
    <AppShell>
      <PageHeader title="Donations" />
      <div className="grid gap-5">
        <HeroCard src="/assets/hero-donations-charity.png" alt="Charity and mosque donation illustration" priority>
          <h2 className="font-brand text-4xl font-semibold">Support Your Masjid</h2>
          <p className="mt-3 max-w-sm text-base leading-7 text-white/86">Your generosity helps sustain prayer, unity, and community work.</p>
        </HeroCard>
        <section>
          <SectionTitle>Quick Donate</SectionTitle>
          <QuickDonateButtons />
        </section>
        <section>
          <SectionTitle>Active Campaigns</SectionTitle>
          <div className="grid gap-3">
            {donationCampaigns.map((campaign) => <DonationCampaignCard key={campaign.id} campaign={campaign} />)}
          </div>
        </section>
        <BankTransferCard settings={donationSettings} />
        <section>
          <SectionTitle>Transparency</SectionTitle>
          <TransparencyCard report={donationReport} />
        </section>
        <Card>
          <h2 className="font-bold text-[var(--color-emerald)]">Donation Receipt Request</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Need a donation receipt? Submit a request and the mosque administration will review it.</p>
        </Card>
      </div>
    </AppShell>
  );
}
