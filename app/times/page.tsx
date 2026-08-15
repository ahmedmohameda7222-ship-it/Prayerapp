import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrayerTimesBrowser } from "@/components/prayer/PrayerTimesBrowser";

export default function TimesPage() {
  return (
    <AppShell>
      <PageHeader titleKey="times.title" arch backHref={null} />
      <PrayerTimesBrowser />
    </AppShell>
  );
}
