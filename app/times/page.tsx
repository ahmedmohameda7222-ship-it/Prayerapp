import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrayerTimesBrowser } from "@/components/prayer/PrayerTimesBrowser";
import { getPrayerSettings } from "@/lib/data/prayer-settings";

export default async function TimesPage() {
  const settings = await getPrayerSettings().catch(() => null);
  return (
    <AppShell>
      <PageHeader titleKey="times.title" arch backHref={null} />
      <PrayerTimesBrowser iqamaDelays={settings?.iqamaDelays ?? null} />
    </AppShell>
  );
}
