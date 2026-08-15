import { FridayPageClient } from "@/components/friday/FridayPageClient";
import { RootPageHeader } from "@/components/layout/RootPageHeader";
import { AppShell } from "@/components/layout/AppShell";
import { getJumuahTimes } from "@/lib/data/jumuah";
import type { JumuahTime } from "@/lib/types";

export default async function FridayPage() {
  const initialNow = new Date().toISOString();
  let jumuahTimes: JumuahTime[] = [];
  let loadFailed = false;

  try {
    jumuahTimes = await getJumuahTimes();
  } catch {
    loadFailed = true;
  }

  return (
    <AppShell surface="home">
      <RootPageHeader titleKey="friday.title" />
      <FridayPageClient
        jumuahTimes={jumuahTimes}
        initialNow={initialNow}
        loadFailed={loadFailed}
      />
    </AppShell>
  );
}
