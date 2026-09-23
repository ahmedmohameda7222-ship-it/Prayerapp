import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrayerTimesBrowser } from "@/components/prayer/PrayerTimesBrowser";
import { getRuntimePrayerSettings, getRuntimePrayerTimezone } from "@/lib/data/prayer-settings";

export default async function TimesPage() {
  const [settings, timezone] = await Promise.all([
    getRuntimePrayerSettings().catch(() => null),
    getRuntimePrayerTimezone(),
  ]);
  return (
    <AppShell>
      <PageHeader titleKey="times.title" arch backHref={null} />
      <PrayerTimesBrowser iqamaDelays={settings?.iqamaDelays ?? null} timezone={timezone} />
    </AppShell>
  );
}
