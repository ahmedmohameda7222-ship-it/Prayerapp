import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsControls } from "@/components/settings/SettingsControls";

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader titleKey="settings.title" />
      <SettingsControls />
    </AppShell>
  );
}
