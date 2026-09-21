"use server";

import { addDaysIso, todayIso } from "@/lib/date-utils";
import { getPrayerSettings } from "@/lib/data/prayer-settings";
import { getPrayerTimes } from "@/lib/data/prayer-times";

export async function refreshHomePrayerRuntime() {
  const prayerSettings = await getPrayerSettings();
  if (!prayerSettings) {
    return { schedule: [], iqamaDelays: null, timezone: null };
  }

  const today = todayIso(new Date(), prayerSettings.timezone);
  const startDate = addDaysIso(today, -1);
  const endDate = addDaysIso(today, 30);
  const schedule = await getPrayerTimes(false, startDate, endDate);

  return {
    schedule,
    iqamaDelays: prayerSettings.iqamaDelays,
    timezone: prayerSettings.timezone,
  };
}
