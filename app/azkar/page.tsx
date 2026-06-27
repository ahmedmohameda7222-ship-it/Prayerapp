import { AzkarRoutine } from "@/components/azkar/AzkarRoutine";
import { AppShell } from "@/components/layout/AppShell";
import { getAzkarCategories, getAzkarItems } from "@/lib/data/azkar";

export default async function AzkarPage() {
  const [categories, items] = await Promise.all([
    getAzkarCategories(),
    getAzkarItems(),
  ]);

  return (
    <AppShell>
      <AzkarRoutine categories={categories} items={items} />
    </AppShell>
  );
}
