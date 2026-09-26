"use server";

import { getPublishedPrayerScheduleSnapshot } from "@/lib/data/prayer-schedule-snapshot";
import { getPrayerRuntimeAuthority } from "@/lib/data/prayer-settings";

export async function loadPrayerScheduleRuntime(from: string, through: string) {
  const [snapshot, prayerAuthority] = await Promise.all([
    getPublishedPrayerScheduleSnapshot({ from, through }),
    getPrayerRuntimeAuthority().catch(() => undefined),
  ]);

  return {
    schedule: snapshot.rows,
    iqamaDelays: prayerAuthority === undefined ? undefined : prayerAuthority?.iqamaDelays ?? null,
    timezone: snapshot.timezone,
  };
}

export async function refreshHomePrayerRuntime() {
  const now = new Date();
  const [snapshot, prayerAuthority] = await Promise.all([
    getPublishedPrayerScheduleSnapshot({
      now,
      daysBefore: 1,
      daysAfter: 30,
    }),
    getPrayerRuntimeAuthority().catch(() => undefined),
  ]);

  return {
    schedule: snapshot.rows,
    iqamaDelays: prayerAuthority === undefined ? undefined : prayerAuthority?.iqamaDelays ?? null,
    timezone: snapshot.timezone,
  };
}
