import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrayerTimesBrowser } from "@/components/prayer/PrayerTimesBrowser";
import { getPrayerRuntimeAuthority } from "@/lib/data/prayer-settings";
import { APP_TIME_ZONE } from "@/lib/date-utils";
import { getPublishedPrayerScheduleSnapshot } from "@/lib/data/prayer-schedule-snapshot";

export default async function TimesPage() {
  const [authority, snapshot] = await Promise.all([
    getPrayerRuntimeAuthority().catch(() => null),
    getPublishedPrayerScheduleSnapshot({ now: new Date(), daysAfter: 0 }).catch(() => null),
  ]);
  const timezone = snapshot?.timezone ?? authority?.timezone ?? APP_TIME_ZONE;
  return (
    <AppShell>
      <PageHeader titleKey="times.title" arch backHref={null} />
      <PrayerTimesBrowser iqamaDelays={authority?.iqamaDelays ?? null} timezone={timezone} />
    </AppShell>
  );
}
