import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsControls } from "@/components/settings/SettingsControls";

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader title="Settings" />
      <SettingsControls />
    </AppShell>
  );
}
