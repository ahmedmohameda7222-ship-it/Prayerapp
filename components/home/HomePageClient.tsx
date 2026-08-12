"use client";

import { useEffect, useMemo, useState } from "react";
import { HeroCard } from "@/components/ui/HeroCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrayerCountdown } from "@/components/prayer/PrayerCountdown";
import { HomePrayerTimesCard } from "@/components/prayer/HomePrayerTimesCard";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { EventCard } from "@/components/events/EventCard";
import { BankTransferCard } from "@/components/donations/BankTransferCard";
import { DonationCampaignCard } from "@/components/donations/DonationCampaignCard";
import { PayPalCard } from "@/components/donations/PayPalCard";
import { SmartNextActionCard } from "@/components/home/SmartNextActionCard";
import { todayIso } from "@/lib/date-utils";
import { getSmartNextAction } from "@/lib/home-utils";
import { getNextPrayer, getNextPrayerFromSchedule, getPrayerForDate } from "@/lib/prayer-utils";
import { phase1Copy } from "@/lib/i18n/phase1-copy";
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
  const { t, locale } = useTranslation();
  const copy = phase1Copy[locale];
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
    <div className="home-dashboard grid gap-5">
      {today ? (
        <div className="home-hero">
          <HeroCard
            src="/assets/hero-home-mosque-night.png"
            desktopSrc="/assets/hero-home-mosque-night-desktop.png"
            alt={t("home.heroAlt")}
            priority
          >
            <PrayerCountdown prayer={today} schedule={schedule.length ? schedule : [today]} initialNow={initialNow} />
          </HeroCard>
        </div>
      ) : (
        <EmptyState message={t("prayer.notPublished")} />
      )}

      {urgentAnnouncements.length ? (
        <section className="home-urgent-news">
          <SectionTitle>{t("news.title")}</SectionTitle>
          <div className="grid gap-3">
            {urgentAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} home />
            ))}
          </div>
        </section>
      ) : null}

      {today ? <HomePrayerTimesCard prayer={today} activePrayer={activePrayer} /> : null}

      {smartAction ? <div className="home-smart"><SmartNextActionCard action={smartAction} /></div> : null}

      {events.length ? (
        <section className="home-events">
          <SectionTitle>{t("events.title")}</SectionTitle>
          <div className="grid gap-3">
            {events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </section>
      ) : null}

      {hasDonationContent ? (
        <section className="home-donations">
          <SectionTitle>{t("donations.title")}</SectionTitle>
          <div className="mb-4 rounded-[24px] border border-[var(--color-gold)]/45 bg-[#fff9e8] p-5 text-center">
            <p dir="rtl" lang="ar" className="text-lg font-semibold leading-8 text-[var(--color-emerald-dark)]">لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ</p>
            <p className="mt-1 text-xs font-extrabold text-[var(--color-gold-dark)]">{copy.donationReflectionVerse}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--color-charcoal)]">{copy.donationReflection}</p>
          </div>
          <div className="grid gap-3">
            {donationCampaigns.map((campaign) => (
              <DonationCampaignCard key={campaign.id} campaign={campaign} />
            ))}
            {hasBankDetails && donationSettings ? <BankTransferCard settings={donationSettings} /> : null}
            {donationSettings?.paypalLink ? <PayPalCard paypalLink={donationSettings.paypalLink} showUrl={false} /> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
