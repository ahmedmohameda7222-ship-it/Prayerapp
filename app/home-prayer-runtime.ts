"use server";

import { addDaysIso, todayIso } from "@/lib/date-utils";
import { getPrayerSettings } from "@/lib/data/prayer-settings";
import { getPrayerTimes } from "@/lib/data/prayer-times";

export async function refreshHomePrayerRuntime() {
  const today = todayIso(new Date());
  const startDate = addDaysIso(today, -1);
  const endDate = addDaysIso(today, 30);
  const [schedule, prayerSettings] = await Promise.all([
    getPrayerTimes(false, startDate, endDate),
    getPrayerSettings(),
  ]);

  return {
    schedule,
    iqamaDelays: prayerSettings?.iqamaDelays ?? null,
  };
}
