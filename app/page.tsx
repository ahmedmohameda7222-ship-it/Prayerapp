"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, HandHeart } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { HeroCard } from "@/components/ui/HeroCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { DataError, DataLoading } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { PrayerCountdown } from "@/components/prayer/PrayerCountdown";
import { PrayerTimesCard } from "@/components/prayer/PrayerTimesCard";
import { QuickActionCard } from "@/components/home/QuickActionCard";
import { SmartNextActionCard } from "@/components/home/SmartNextActionCard";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { todayIso } from "@/lib/date-utils";
import { getSmartNextAction } from "@/lib/home-utils";
import { getNextPrayer, getNextPrayerFromSchedule, getPrayerForDate } from "@/lib/prayer-utils";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { PrayerTime } from "@/lib/types";

const EMPTY_SCHEDULE: PrayerTime[] = [];

export default function HomePage() {
  const { t } = useTranslation();
  const { data: prayerTimes, error, loading, reload } = useAsyncData(getPrayerTimes);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const schedule = prayerTimes || EMPTY_SCHEDULE;
  const today = getPrayerForDate(schedule, todayIso(now));
  const activePrayer = useMemo(() => {
    const next = getNextPrayerFromSchedule(schedule, now);
    return next?.name || (today ? getNextPrayer(today, now).name : undefined);
  }, [now, schedule, today]);
  const smartAction = useMemo(() => schedule.length ? getSmartNextAction(schedule, now) : undefined, [now, schedule]);

  return (
    <AppShell>
      <AppHeader />
      <div className="grid gap-5">
        {loading ? <DataLoading /> : null}
        {error ? <DataError message={error} retry={reload} /> : null}
        {today ? (
          <>
            <HeroCard src="/assets/hero-home-mosque-night.png" desktopSrc="/assets/hero-home-mosque-night-desktop.png" alt={t("home.heroAlt")} priority>
              <PrayerCountdown prayer={today} schedule={schedule.length ? schedule : [today]} />
            </HeroCard>
            <PrayerTimesCard prayer={today} activePrayer={activePrayer} />
            {smartAction ? <SmartNextActionCard action={smartAction} /> : null}
          </>
        ) : !loading && !error ? <EmptyState message={t("prayer.notPublished")} /> : null}
        <section>
          <SectionTitle>{t("home.quickActions")}</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            <QuickActionCard href="/friday" title={t("home.jumuah")} description={t("home.jumuahDesc")} icon={MosqueIcon} />
            <QuickActionCard href="/donations" title={t("home.supportMasjid")} description={t("home.supportMasjidDesc")} icon={HandHeart} />
            <QuickActionCard href="/azkar" title={t("home.azkarReminder")} description={t("home.azkarReminderDesc")} icon={BookOpen} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
