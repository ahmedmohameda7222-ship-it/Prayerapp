import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { QiblaExperience } from "@/components/qibla/QiblaExperience";

export default function QiblaPage() {
  return (
    <AppShell>
      <PageHeader titleKey="qibla.title" />
      <QiblaExperience />
    </AppShell>
  );
}
