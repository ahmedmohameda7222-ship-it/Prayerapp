import { FridayPageClient } from "@/components/friday/FridayPageClient";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { FRIDAY_VISUAL_FIXTURE } from "@/lib/jumuah-visual-fixture";

export default async function FridayPage() {
  const initialNow = new Date().toISOString();

  return (
    <AppShell surface="home">
      <AppHeader />
      <FridayPageClient
        jumuahTimes={FRIDAY_VISUAL_FIXTURE}
        initialNow={initialNow}
        loadFailed={false}
      />
    </AppShell>
  );
}
