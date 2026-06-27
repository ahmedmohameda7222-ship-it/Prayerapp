import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsControls } from "@/components/settings/SettingsControls";
import { InstallAppCard } from "@/components/settings/InstallAppCard";

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader titleKey="settings.title" />
      <div className="grid gap-5">
        <InstallAppCard />
        <SettingsControls />
      </div>
    </AppShell>
  );
}
