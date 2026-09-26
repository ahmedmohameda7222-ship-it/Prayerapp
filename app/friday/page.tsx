import { FridayPageClient } from "@/components/friday/FridayPageClient";
import { RootPageHeader } from "@/components/layout/RootPageHeader";
import { AppShell } from "@/components/layout/AppShell";
import { getFridayKhutbahByDate } from "@/lib/data/friday-khutbahs";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { getPublishedPrayerScheduleSnapshot } from "@/lib/data/prayer-schedule-snapshot";
import { APP_TIME_ZONE } from "@/lib/date-utils";
import { resolveUpcomingFridaySchedule } from "@/lib/friday";
import type { FridayKhutbah, JumuahTime, PrayerTime } from "@/lib/types";

export default async function FridayPage() {
  const initialNow = new Date().toISOString();
  const now = new Date(initialNow);
  const [prayerSnapshotResult, jumuahTimesResult] = await Promise.allSettled([
    getPublishedPrayerScheduleSnapshot({ now, daysAfter: 35 }),
    getJumuahTimes(),
  ]);

  const prayerSnapshot = prayerSnapshotResult.status === "fulfilled" ? prayerSnapshotResult.value : null;
  const timezone = prayerSnapshot?.timezone ?? APP_TIME_ZONE;
  const prayerTimes: PrayerTime[] = prayerSnapshot?.rows ?? [];
  const jumuahTimes: JumuahTime[] = jumuahTimesResult.status === "fulfilled" ? jumuahTimesResult.value : [];
  const schedule = prayerSnapshot
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
        prayerTimesLoadFailed={prayerSnapshotResult.status === "rejected"}
        additionalTimesLoadFailed={jumuahTimesResult.status === "rejected"}
        khutbahLoadFailed={khutbahLoadFailed}
      />
    </AppShell>
  );
}
