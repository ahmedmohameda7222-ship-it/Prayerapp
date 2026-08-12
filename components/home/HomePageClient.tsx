"use client";

import { useEffect, useMemo, useState } from "react";
import { HomeSectionTitle } from "@/components/home/HomeSectionTitle";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { HomeNextPrayerSurface } from "@/components/home/HomeNextPrayerSurface";
import { PrayerCountdown } from "@/components/prayer/PrayerCountdown";
import { HomePrayerTimesCard } from "@/components/prayer/HomePrayerTimesCard";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { HomeEventsList } from "@/components/events/HomeEventsList";
import { BankTransferCard } from "@/components/donations/BankTransferCard";
import { DonationCampaignCard } from "@/components/donations/DonationCampaignCard";
import { PayPalCard } from "@/components/donations/PayPalCard";
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
  initialNow: string;
};

export function HomePageClient({
  initialPrayerTimes,
  urgentAnnouncements,
  events,
  donationSettings,
  donationCampaigns,
  initialNow,
}: HomePageClientProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date(initialNow));
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
    <div className="home-dashboard grid" data-testid="home-dashboard">
      <section className="home-section-next" data-home-section="hero" aria-label={t("prayer.nextPrayer")}>
        {today ? (
          <HomeNextPrayerSurface>
            <PrayerCountdown prayer={today} schedule={schedule.length ? schedule : [today]} initialNow={initialNow} variant="instrument" />
          </HomeNextPrayerSurface>
        ) : (
          <HomeEmptyState message={t("prayer.notPublished")} />
        )}
      </section>

      {urgentAnnouncements.length ? (
        <section className="home-section-urgent" data-home-section="urgent">
          <HomeSectionTitle>{t("news.title")}</HomeSectionTitle>
          <div className="home-urgent-surface divide-y divide-[var(--home-divider)]" data-testid="home-urgent-surface">
            {urgentAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} home />
            ))}
          </div>
        </section>
      ) : null}

      {today ? (
        <div className="home-section-prayer" data-home-section="prayer-times">
          <HomePrayerTimesCard prayer={today} activePrayer={activePrayer} />
        </div>
      ) : null}

      {smartAction ? (
        <div className="home-section-contextual" data-home-section="contextual-action">
          <SmartNextActionCard action={smartAction} />
        </div>
      ) : null}

      {events.length ? (
        <section className="home-section-events" data-home-section="events">
          <HomeSectionTitle>{t("events.title")}</HomeSectionTitle>
          <HomeEventsList events={events} />
        </section>
      ) : null}

      {hasDonationContent ? (
        <section className="home-section-donations" data-home-section="donations">
          <HomeSectionTitle>{t("donations.title")}</HomeSectionTitle>
          <div className="mb-4 text-center">
            <p dir="rtl" lang="ar" className="home-donation-verse text-[20px] font-semibold leading-[1.85] text-[var(--home-brand-strong)]">
              لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--home-text-secondary)]">{t("phase1.donationReflectionVerse")}</p>
            <p className="mt-3 text-[15px] leading-6 text-[var(--home-text-secondary)]">{t("phase1.donationReflection")}</p>
          </div>
          <div className="home-donation-stack">
            {donationCampaigns.map((campaign) => (
              <DonationCampaignCard key={campaign.id} campaign={campaign} home />
            ))}
            {hasBankDetails && donationSettings ? <BankTransferCard settings={donationSettings} home /> : null}
            {donationSettings?.paypalLink ? <PayPalCard paypalLink={donationSettings.paypalLink} showUrl={false} home /> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
