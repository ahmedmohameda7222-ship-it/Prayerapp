"use client";

import { BookOpen, HandHeart } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { HeroCard } from "@/components/ui/HeroCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { PrayerCountdown } from "@/components/prayer/PrayerCountdown";
import { PrayerTimesCard } from "@/components/prayer/PrayerTimesCard";
import { QuickActionCard } from "@/components/home/QuickActionCard";
import { prayerTimes } from "@/lib/mock-data";
import { todayIso } from "@/lib/date-utils";
import { getPrayerForDate } from "@/lib/prayer-utils";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function HomePage() {
  const { t } = useTranslation();
  const today = getPrayerForDate(prayerTimes, todayIso()) ?? prayerTimes[0];

  return (
    <AppShell>
      <AppHeader />
      <div className="grid gap-5">
        <HeroCard src="/assets/hero-home-mosque-night.png" alt={t("home.heroAlt")} priority>
          <PrayerCountdown prayer={today} />
        </HeroCard>
        <PrayerTimesCard prayer={today} />
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
