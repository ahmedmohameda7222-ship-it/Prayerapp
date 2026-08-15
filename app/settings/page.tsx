import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsControls } from "@/components/settings/SettingsControls";
import { InstallAppCard } from "@/components/settings/InstallAppCard";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="settings-screen">
        <PageHeader titleKey="settings.title" backHref="/more" />
        <div className="grid gap-4">
          <InstallAppCard />
          <SettingsControls />
        </div>
      </div>
    </AppShell>
  );
}
