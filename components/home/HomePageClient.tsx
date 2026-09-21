"use client";

import { useEffect, useMemo, useState } from "react";
import { refreshHomePrayerRuntime } from "@/app/home-prayer-runtime";
import { HomeSectionTitle } from "@/components/home/HomeSectionTitle";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { HomeNextPrayerSurface } from "@/components/home/HomeNextPrayerSurface";
import { HomeJumuahCard } from "@/components/home/HomeJumuahCard";
import { PrayerCountdown } from "@/components/prayer/PrayerCountdown";
import { HomePrayerTimesCard } from "@/components/prayer/HomePrayerTimesCard";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { HomeEventsList } from "@/components/events/HomeEventsList";
import { BankTransferCard } from "@/components/donations/BankTransferCard";
import { DonationCampaignCard } from "@/components/donations/DonationCampaignCard";
import { TransparencyCard } from "@/components/donations/TransparencyCard";
import { PayPalCard } from "@/components/donations/PayPalCard";
import { SmartNextActionCard } from "@/components/home/SmartNextActionCard";
import { todayIso } from "@/lib/date-utils";
import { getSmartNextAction } from "@/lib/home-utils";
import { getHomeJumuahSchedule } from "@/lib/home-jumuah";
import { derivePrayerIqamaTimes, getNextPrayer, getNextPrayerFromSchedule, getPrayerForDate } from "@/lib/prayer-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { PrayerIqamaDelays } from "@/lib/prayer-engine/types";
import type { Announcement, DonationCampaign, DonationReport, DonationSettings, Event, JumuahTime, PrayerTime } from "@/lib/types";

const EMPTY_SCHEDULE: PrayerTime[] = [];

const HOME_EMPTY_COPY = {
  events: {
    ar: "لا توجد فعاليات قادمة في المسجد حاليًا.",
    en: "There are no upcoming events at the mosque right now.",
    de: "Derzeit gibt es keine kommenden Veranstaltungen in der Moschee.",
    tr: "Şu anda camide yaklaşan bir etkinlik bulunmuyor.",
  },
  donationCampaigns: {
    ar: "لا توجد حملات تبرع نشطة حاليًا.",
    en: "There are no active donation campaigns right now.",
    de: "Derzeit gibt es keine aktiven Spendenkampagnen.",
    tr: "Şu anda aktif bir bağış kampanyası bulunmuyor.",
  },
  donationOptions: {
    ar: "لا توجد خيارات تبرع متاحة حاليًا.",
    en: "There are no donation options available right now.",
    de: "Derzeit sind keine Spendenmöglichkeiten verfügbar.",
    tr: "Şu anda kullanılabilir bir bağış seçeneği bulunmuyor.",
  },
} as const;

type HomePageClientProps = {
  initialPrayerTimes: PrayerTime[];
  iqamaDelays: PrayerIqamaDelays | null;
  timezone: string | null;
  urgentAnnouncements: Announcement[];
  jumuahTimes: JumuahTime[];
  allowAnyFutureJumuah?: boolean;
  events: Event[];
  donationSettings?: DonationSettings;
  donationCampaigns: DonationCampaign[];
  donationReport?: DonationReport;
  initialNow: string;
};

export function HomePageClient({
  initialPrayerTimes,
  iqamaDelays,
  timezone,
  urgentAnnouncements,
  jumuahTimes,
  allowAnyFutureJumuah = false,
  events,
  donationSettings,
  donationCampaigns,
  donationReport,
  initialNow,
}: HomePageClientProps) {
  const { t, locale } = useTranslation();
  const [now, setNow] = useState(() => new Date(initialNow));
  const [schedule, setSchedule] = useState<PrayerTime[]>(initialPrayerTimes || EMPTY_SCHEDULE);
  const [liveIqamaDelays, setLiveIqamaDelays] = useState<PrayerIqamaDelays | null>(iqamaDelays);
  const [liveTimezone, setLiveTimezone] = useState<string | null>(timezone);
  const today = liveTimezone
    ? getPrayerForDate(schedule, todayIso(now, liveTimezone))
    : undefined;
  const iqamaByDate = useMemo(() => Object.fromEntries(
    schedule.map((item) => [
      item.date,
      liveIqamaDelays && liveTimezone ? derivePrayerIqamaTimes(item, liveIqamaDelays, liveTimezone) : {},
    ]),
  ), [schedule, liveIqamaDelays, liveTimezone]);
  const activePrayer = useMemo(() => {
    if (!liveTimezone) return undefined;
    const next = getNextPrayerFromSchedule(schedule, now, liveTimezone);
    return next?.name || (today ? getNextPrayer(today, now, liveTimezone)?.name : undefined);
  }, [liveTimezone, now, schedule, today]);
  const smartAction = useMemo(
    () => schedule.length && liveTimezone ? getSmartNextAction(schedule, now, liveTimezone) : undefined,
    [liveTimezone, now, schedule],
  );
  const jumuahSchedule = useMemo(
    () => liveTimezone
      ? getHomeJumuahSchedule(schedule, jumuahTimes, now, liveTimezone, { allowAnyFutureFriday: allowAnyFutureJumuah })
      : undefined,
    [allowAnyFutureJumuah, jumuahTimes, liveTimezone, now, schedule],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const refreshPrayerSchedule = async () => {
      try {
        const latest = await refreshHomePrayerRuntime();
        if (active) {
          setSchedule(latest.schedule);
          setLiveIqamaDelays(latest.iqamaDelays);
          setLiveTimezone(latest.timezone);
        }
      } catch {
        // Keep the last verified schedule and Iqama-delay snapshot together.
      }
    };
    const onFocus = () => { void refreshPrayerSchedule(); };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshPrayerSchedule();
    };
    const timer = window.setInterval(() => { void refreshPrayerSchedule(); }, 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const hasBankDetails = Boolean(
    donationSettings && (
      donationSettings.accountHolder
      || donationSettings.iban
      || donationSettings.bic
      || donationSettings.defaultPurpose
    ),
  );
  const hasDonationContent = donationCampaigns.length > 0 || hasBankDetails || Boolean(donationReport) || Boolean(donationSettings?.paypalLink);
  const donationEmptyMessage = hasDonationContent
    ? HOME_EMPTY_COPY.donationCampaigns[locale]
    : HOME_EMPTY_COPY.donationOptions[locale];

  return (
    <div className="home-dashboard grid" data-testid="home-dashboard">
      <section className="home-section-next" data-home-section="hero" aria-label={t("prayer.nextPrayer")}>
        {today && liveTimezone ? (
          <HomeNextPrayerSurface>
            <PrayerCountdown prayer={today} schedule={schedule.length ? schedule : [today]} iqamaByDate={iqamaByDate} initialNow={initialNow} timezone={liveTimezone} variant="instrument" />
          </HomeNextPrayerSurface>
        ) : (
          <HomeEmptyState message={t("prayer.notPublished")} />
        )}
      </section>

      {urgentAnnouncements.length ? (
        <section className="home-section-urgent home-section-card" data-home-section="urgent">
          <div className="home-section-card-header"><HomeSectionTitle>{t("news.title")}</HomeSectionTitle></div>
          <div className="home-urgent-surface divide-y divide-[var(--home-divider)]" data-testid="home-urgent-surface">
            {urgentAnnouncements.map((announcement) => <AnnouncementCard key={announcement.id} announcement={announcement} home />)}
          </div>
        </section>
      ) : null}

      {jumuahSchedule ? <section className="home-section-jumuah" data-home-section="jumuah"><HomeJumuahCard schedule={jumuahSchedule} /></section> : null}

      {today ? (
        <div className="home-section-prayer" data-home-section="prayer-times">
          <HomePrayerTimesCard prayer={today} activePrayer={activePrayer} iqamaTimes={iqamaByDate[today.date]} />
        </div>
      ) : null}

      {smartAction ? <div className="home-section-contextual" data-home-section="contextual-action"><SmartNextActionCard action={smartAction} /></div> : null}

      <section className="home-section-events home-section-card" data-home-section="events">
        <div className="home-section-card-header"><HomeSectionTitle>{t("events.title")}</HomeSectionTitle></div>
        {events.length ? <HomeEventsList events={events} /> : <p className="home-section-empty-message">{HOME_EMPTY_COPY.events[locale]}</p>}
      </section>

      <section className="home-section-donations home-section-card" data-home-section="donations">
        <div className="home-section-card-header"><HomeSectionTitle>{t("donations.title")}</HomeSectionTitle></div>
        <div className="home-donation-reflection text-center">
          <p dir="rtl" lang="ar" className="home-donation-verse font-semibold leading-[1.85] text-[var(--home-brand-strong)]">لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ</p>
          <p dir="rtl" lang="ar" className="home-donation-reference mt-1 font-semibold text-[var(--home-text-secondary)]">آل عمران: 92</p>
          <p className="home-donation-reflection-copy mt-3 leading-6 text-[var(--home-text-secondary)]">{t("phase1.donationReflection")}</p>
        </div>
        <div className="home-donation-stack">
          {donationCampaigns.length ? donationCampaigns.map((campaign) => <DonationCampaignCard key={campaign.id} campaign={campaign} home />) : <p className="home-section-empty-message home-donation-empty-message">{donationEmptyMessage}</p>}
          {hasBankDetails && donationSettings ? <BankTransferCard settings={donationSettings} home /> : null}
          {donationReport ? <TransparencyCard report={donationReport} home /> : null}
          {donationSettings?.paypalLink ? <PayPalCard paypalLink={donationSettings.paypalLink} showUrl={false} home /> : null}
        </div>
      </section>
    </div>
  );
}
