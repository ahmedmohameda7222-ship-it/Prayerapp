"use server";

import { getPublishedPrayerScheduleSnapshot } from "@/lib/data/prayer-schedule-snapshot";
import { getRuntimePrayerSettings } from "@/lib/data/prayer-settings";

export async function loadPrayerScheduleRuntime(from: string, through: string) {
  const [snapshot, prayerSettings] = await Promise.all([
    getPublishedPrayerScheduleSnapshot({ from, through }),
    getRuntimePrayerSettings().catch(() => undefined),
  ]);

  return {
    schedule: snapshot.rows,
    iqamaDelays: prayerSettings === undefined ? undefined : prayerSettings?.iqamaDelays ?? null,
    timezone: snapshot.timezone,
  };
}

export async function refreshHomePrayerRuntime() {
  const now = new Date();
  const [snapshot, prayerSettings] = await Promise.all([
    getPublishedPrayerScheduleSnapshot({
      now,
      daysBefore: 1,
      daysAfter: 30,
    }),
    getRuntimePrayerSettings().catch(() => undefined),
  ]);

  return {
    schedule: snapshot.rows,
    iqamaDelays: prayerSettings === undefined ? undefined : prayerSettings?.iqamaDelays ?? null,
    timezone: snapshot.timezone,
  };
}
