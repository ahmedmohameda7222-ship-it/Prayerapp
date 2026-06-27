"use client";

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
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { todayIso } from "@/lib/date-utils";
import { getPrayerForDate } from "@/lib/prayer-utils";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function HomePage() {
  const { t } = useTranslation();
  const { data: prayerTimes, error, loading, reload } = useAsyncData(getPrayerTimes);
  const today = getPrayerForDate(prayerTimes || [], todayIso());

  return (
    <AppShell>
      <AppHeader />
      <div className="grid gap-5">
        {loading ? <DataLoading /> : null}
        {error ? <DataError message={error} retry={reload} /> : null}
        {today ? (
          <>
            <HeroCard src="/assets/hero-home-mosque-night.png" alt={t("home.heroAlt")} priority>
              <PrayerCountdown prayer={today} schedule={prayerTimes || [today]} />
            </HeroCard>
            <PrayerTimesCard prayer={today} />
          </>
        ) : !loading && !error ? <EmptyState message={t("prayer.notPublished")} /> : null}
        <section>
          <SectionTitle>{t("home.quickActions")}</SectionTitle>
          <div className="grid gap-3">
            <QuickActionCard href="/friday" title={t("home.jumuah")} description={t("home.jumuahDesc")} icon={MosqueIcon} />
            <QuickActionCard href="/donations" title={t("home.supportMasjid")} description={t("home.supportMasjidDesc")} icon={HandHeart} />
            <QuickActionCard href="/azkar" title={t("home.azkarReminder")} description={t("home.azkarReminderDesc")} icon={BookOpen} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
