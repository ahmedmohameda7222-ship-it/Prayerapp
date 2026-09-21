import { FridayPageClient } from "@/components/friday/FridayPageClient";
import { RootPageHeader } from "@/components/layout/RootPageHeader";
import { AppShell } from "@/components/layout/AppShell";
import { getFridayKhutbahByDate } from "@/lib/data/friday-khutbahs";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { getPrayerSettings } from "@/lib/data/prayer-settings";
import { addDaysIso, todayIso } from "@/lib/date-utils";
import { resolveUpcomingFridaySchedule } from "@/lib/friday";
import type { FridayKhutbah, JumuahTime, PrayerTime } from "@/lib/types";

export default async function FridayPage() {
  const initialNow = new Date().toISOString();
  const now = new Date(initialNow);
  const prayerSettings = await getPrayerSettings().catch(() => null);
  const timezone = prayerSettings?.timezone ?? null;
  const today = timezone ? todayIso(now, timezone) : null;
  const endDate = today ? addDaysIso(today, 35) : null;
  const [prayerTimesResult, jumuahTimesResult] = await Promise.allSettled([
    today && endDate ? getPrayerTimes(false, today, endDate) : Promise.resolve([]),
    getJumuahTimes(),
  ]);

  const prayerTimes: PrayerTime[] = prayerTimesResult.status === "fulfilled" ? prayerTimesResult.value : [];
  const jumuahTimes: JumuahTime[] = jumuahTimesResult.status === "fulfilled" ? jumuahTimesResult.value : [];
  const schedule = prayerTimesResult.status === "fulfilled" && timezone
    ? resolveUpcomingFridaySchedule(prayerTimes, jumuahTimes, now, timezone)
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
        timezone={timezone}
        initialScheduleDate={schedule?.date || ""}
        prayerTimesLoadFailed={prayerTimesResult.status === "rejected"}
        additionalTimesLoadFailed={jumuahTimesResult.status === "rejected"}
        khutbahLoadFailed={khutbahLoadFailed}
      />
    </AppShell>
  );
}
