"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, HandHeart } from "lucide-react";
import { HeroCard } from "@/components/ui/HeroCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { PrayerCountdown } from "@/components/prayer/PrayerCountdown";
import { PrayerTimesCard } from "@/components/prayer/PrayerTimesCard";
import { QuickActionCard } from "@/components/home/QuickActionCard";
import { SmartNextActionCard } from "@/components/home/SmartNextActionCard";
import { todayIso } from "@/lib/date-utils";
import { getSmartNextAction } from "@/lib/home-utils";
import { getNextPrayer, getNextPrayerFromSchedule, getPrayerForDate } from "@/lib/prayer-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { PrayerTime } from "@/lib/types";

const EMPTY_SCHEDULE: PrayerTime[] = [];

export function HomePageClient({ initialPrayerTimes }: { initialPrayerTimes: PrayerTime[] }) {
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

  return (
    <div className="home-dashboard grid gap-5">
      {today ? (
        <>
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
          <div className="home-prayers"><PrayerTimesCard prayer={today} activePrayer={activePrayer} /></div>
          {smartAction ? <div className="home-smart"><SmartNextActionCard action={smartAction} /></div> : null}
        </>
      ) : (
        <EmptyState message={t("prayer.notPublished")} />
      )}
      <section className="home-quick-actions">
        <SectionTitle>{t("home.quickActions")}</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          <QuickActionCard href="/friday" title={t("home.jumuah")} description={t("home.jumuahDesc")} icon={MosqueIcon} />
          <QuickActionCard href="/donations" title={t("home.supportMasjid")} description={t("home.supportMasjidDesc")} icon={HandHeart} />
          <QuickActionCard href="/azkar" title={t("home.azkarReminder")} description={t("home.azkarReminderDesc")} icon={BookOpen} />
        </div>
      </section>
    </div>
  );
}
