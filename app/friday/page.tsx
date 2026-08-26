import { FridayPageClient } from "@/components/friday/FridayPageClient";
import { RootPageHeader } from "@/components/layout/RootPageHeader";
import { AppShell } from "@/components/layout/AppShell";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { addDaysIso, todayIso } from "@/lib/date-utils";
import type { JumuahTime, PrayerTime } from "@/lib/types";

export default async function FridayPage() {
  const initialNow = new Date().toISOString();
  const today = todayIso(new Date(initialNow));
  const endDate = addDaysIso(today, 35);
  const [prayerTimesResult, jumuahTimesResult] = await Promise.allSettled([
    getPrayerTimes(false, today, endDate),
    getJumuahTimes(),
  ]);

  const prayerTimes: PrayerTime[] = prayerTimesResult.status === "fulfilled" ? prayerTimesResult.value : [];
  const jumuahTimes: JumuahTime[] = jumuahTimesResult.status === "fulfilled" ? jumuahTimesResult.value : [];

  return (
    <AppShell surface="home">
      <RootPageHeader titleKey="friday.title" />
      <FridayPageClient
        prayerTimes={prayerTimes}
        jumuahTimes={jumuahTimes}
        initialNow={initialNow}
        prayerTimesLoadFailed={prayerTimesResult.status === "rejected"}
        additionalTimesLoadFailed={jumuahTimesResult.status === "rejected"}
      />
    </AppShell>
  );
}
