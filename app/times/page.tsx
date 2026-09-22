import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrayerTimesBrowser } from "@/components/prayer/PrayerTimesBrowser";
import { getRuntimePrayerSettings } from "@/lib/data/prayer-settings";

export default async function TimesPage() {
  const settings = await getRuntimePrayerSettings().catch(() => null);
  return (
    <AppShell>
      <PageHeader titleKey="times.title" arch backHref={null} />
      <PrayerTimesBrowser iqamaDelays={settings?.iqamaDelays ?? null} timezone={settings?.timezone ?? null} />
    </AppShell>
  );
}
