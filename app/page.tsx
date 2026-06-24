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

export default function HomePage() {
  const today = getPrayerForDate(prayerTimes, todayIso()) ?? prayerTimes[0];

  return (
    <AppShell>
      <AppHeader />
      <div className="grid gap-5">
        <HeroCard src="/assets/hero-home-mosque-night.png" alt="Night mosque illustration for Deggendorf Prayer" priority>
          <PrayerCountdown prayer={today} />
        </HeroCard>
        <PrayerTimesCard prayer={today} />
        <section>
          <SectionTitle>Quick Actions</SectionTitle>
          <div className="grid gap-3">
            <QuickActionCard href="/friday" title="Jumu'ah" description="Khutbah, prayer time, location, and notes." icon={MosqueIcon} />
            <QuickActionCard href="/donations" title="Support Your Masjid" description="Donate by bank transfer and follow campaigns." icon={HandHeart} />
            <QuickActionCard href="/azkar" title="Daily Azkar Reminder" description="Morning, evening, and after-prayer dhikr." icon={BookOpen} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
