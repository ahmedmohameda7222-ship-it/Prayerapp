import { FridayPageClient } from "@/components/friday/FridayPageClient";
import { AppHeader } from "@/components/layout/AppHeader";
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
      <AppHeader />
      <FridayPageClient
        jumuahTimes={jumuahTimes}
        initialNow={initialNow}
        loadFailed={loadFailed}
      />
    </AppShell>
  );
}
