import { AzkarRoutine } from "@/components/azkar/AzkarRoutine";
import { AppShell } from "@/components/layout/AppShell";
import { getAzkarCategories, getAzkarItems } from "@/lib/data/azkar";
import { getRuntimePrayerTimezone } from "@/lib/data/prayer-settings";

export default async function AzkarPage() {
  const [categories, items, prayerTimezone] = await Promise.all([
    getAzkarCategories(),
    getAzkarItems(),
    getRuntimePrayerTimezone(),
  ]);

  return (
    <AppShell>
      <AzkarRoutine categories={categories} items={items} timezone={prayerTimezone} />
    </AppShell>
  );
}
