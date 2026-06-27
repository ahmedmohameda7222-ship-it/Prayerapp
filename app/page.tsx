import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { todayIso, addDaysIso } from "@/lib/date-utils";
import { HomePageClient } from "@/components/home/HomePageClient";

export default async function HomePage() {
  const today = todayIso();
  const startDate = addDaysIso(today, -1);
  const endDate = addDaysIso(today, 30);
  const prayerTimes = await getPrayerTimes(false, startDate, endDate);

  return (
    <AppShell>
      <AppHeader />
      <HomePageClient initialPrayerTimes={prayerTimes} />
    </AppShell>
  );
}
