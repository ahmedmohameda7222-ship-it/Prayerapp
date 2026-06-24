import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrayerTimesBrowser } from "@/components/prayer/PrayerTimesBrowser";

export default function TimesPage() {
  return (
    <AppShell>
      <PageHeader title="Prayer Times" arch />
      <PrayerTimesBrowser />
    </AppShell>
  );
}
