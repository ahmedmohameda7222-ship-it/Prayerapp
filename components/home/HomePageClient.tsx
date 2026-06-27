"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { HeroCard } from "@/components/ui/HeroCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { PrayerCountdown } from "@/components/prayer/PrayerCountdown";
import { PrayerTimesCard } from "@/components/prayer/PrayerTimesCard";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { EventCard } from "@/components/events/EventCard";
import { BankTransferCard } from "@/components/donations/BankTransferCard";
import { DonationCampaignCard } from "@/components/donations/DonationCampaignCard";
import { PayPalCard } from "@/components/donations/PayPalCard";
import { QuickActionCard } from "@/components/home/QuickActionCard";
import { SmartNextActionCard } from "@/components/home/SmartNextActionCard";
import { todayIso } from "@/lib/date-utils";
import { getSmartNextAction } from "@/lib/home-utils";
import { getNextPrayer, getNextPrayerFromSchedule, getPrayerForDate } from "@/lib/prayer-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Announcement, DonationCampaign, DonationSettings, Event, PrayerTime } from "@/lib/types";

const EMPTY_SCHEDULE: PrayerTime[] = [];

type HomePageClientProps = {
  initialPrayerTimes: PrayerTime[];
  urgentAnnouncements: Announcement[];
  events: Event[];
  donationSettings?: DonationSettings;
  donationCampaigns: DonationCampaign[];
};

export function HomePageClient({
  initialPrayerTimes,
  urgentAnnouncements,
  events,
  donationSettings,
  donationCampaigns,
}: HomePageClientProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date());
  const schedule = initialPrayerTimes || EMPTY_SCHEDULE;
  const today = getPrayerForDate(schedule, todayIso(now));
  const activePrayer = useMemo(() => {
    const next = getNextPrayerFromSchedule(schedule, now);
    return next?.name || (today ? getNextPrayer(today, now).name : undefined);
  }, [now, schedule, today]);
  const smartAction = useMemo(() => schedule.length ? getSmartNextAction(schedule, now) : undefined, [now, schedule]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const hasBankDetails = Boolean(
    donationSettings && (
      donationSettings.accountHolder
      || donationSettings.iban
      || donationSettings.bic
      || donationSettings.defaultPurpose
    ),
  );
  const hasDonationContent = donationCampaigns.length > 0 || hasBankDetails || Boolean(donationSettings?.paypalLink);

  return (
    <div className="home-dashboard grid gap-5">
      {today ? (
        <div className="home-hero">
          <HeroCard
            src="/assets/hero-home-mosque-night.png"
            desktopSrc="/assets/hero-home-mosque-night-desktop.png"
            alt={t("home.heroAlt")}
            priority
          >
            <PrayerCountdown prayer={today} schedule={schedule.length ? schedule : [today]} />
          </HeroCard>
        </div>
      ) : (
        <EmptyState message={t("prayer.notPublished")} />
      )}

      {urgentAnnouncements.length ? (
        <section className="home-urgent-news">
          <SectionTitle>Urgent News</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            {urgentAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        </section>
      ) : null}

      {today ? <div className="home-prayers"><PrayerTimesCard prayer={today} activePrayer={activePrayer} /></div> : null}

      {events.length ? (
        <section className="home-events">
          <SectionTitle>Event</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            {events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </section>
      ) : null}

      {hasDonationContent ? (
        <section className="home-donations">
          <SectionTitle>{t("donations.title")}</SectionTitle>
          <div className="grid gap-5 lg:grid-cols-2">
            {donationCampaigns.length ? (
              <div className="lg:col-span-2">
                <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]">{t("donations.activeCampaigns")}</h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {donationCampaigns.map((campaign) => (
                    <DonationCampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              </div>
            ) : null}
            {hasBankDetails && donationSettings ? <BankTransferCard settings={donationSettings} /> : null}
            {donationSettings?.paypalLink ? <PayPalCard paypalLink={donationSettings.paypalLink} /> : null}
          </div>
        </section>
      ) : null}

      {smartAction ? <div className="home-smart"><SmartNextActionCard action={smartAction} /></div> : null}

      <section className="home-quick-actions">
        <SectionTitle>{t("home.quickActions")}</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          <QuickActionCard href="/friday" title={t("home.jumuah")} description={t("home.jumuahDesc")} icon={MosqueIcon} />
          <QuickActionCard href="/azkar" title={t("home.azkarReminder")} description={t("home.azkarReminderDesc")} icon={BookOpen} />
        </div>
      </section>
    </div>
  );
}
