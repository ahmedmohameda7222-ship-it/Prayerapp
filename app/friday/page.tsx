import { FridayPageClient } from "@/components/friday/FridayPageClient";
import { RootPageHeader } from "@/components/layout/RootPageHeader";
import { AppShell } from "@/components/layout/AppShell";
import { getFridayKhutbahByDate } from "@/lib/data/friday-khutbahs";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { addDaysIso, todayIso } from "@/lib/date-utils";
import { resolveUpcomingFridaySchedule } from "@/lib/friday";
import type { FridayKhutbah, JumuahTime, PrayerTime } from "@/lib/types";

export default async function FridayPage() {
  const initialNow = new Date().toISOString();
  const now = new Date(initialNow);
  const today = todayIso(now);
  const endDate = addDaysIso(today, 35);
  const [prayerTimesResult, jumuahTimesResult] = await Promise.allSettled([
    getPrayerTimes(false, today, endDate),
    getJumuahTimes(),
  ]);

  const prayerTimes: PrayerTime[] = prayerTimesResult.status === "fulfilled" ? prayerTimesResult.value : [];
  const jumuahTimes: JumuahTime[] = jumuahTimesResult.status === "fulfilled" ? jumuahTimesResult.value : [];
  const schedule = prayerTimesResult.status === "fulfilled"
    ? resolveUpcomingFridaySchedule(prayerTimes, jumuahTimes, now)
    : undefined;

  let fridayKhutbah: FridayKhutbah | undefined;
  let khutbahLoadFailed = false;
  if (schedule) {
    try {
      fridayKhutbah = await getFridayKhutbahByDate(schedule.date);
    } catch {
      khutbahLoadFailed = true;
    }
  }

  return (
    <AppShell surface="home">
      <RootPageHeader titleKey="friday.title" />
      <FridayPageClient
        prayerTimes={prayerTimes}
        jumuahTimes={jumuahTimes}
        fridayKhutbah={fridayKhutbah}
        initialNow={initialNow}
        prayerTimesLoadFailed={prayerTimesResult.status === "rejected"}
        additionalTimesLoadFailed={jumuahTimesResult.status === "rejected"}
        khutbahLoadFailed={khutbahLoadFailed}
      />
    </AppShell>
  );
}
