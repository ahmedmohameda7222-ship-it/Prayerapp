import { AdminShell } from "@/components/layout/AdminShell";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { FormField } from "@/components/admin/FormField";
import { mosqueSettings } from "@/lib/mock-data";

export default function AdminSettingsPage() {
  return (
    <AdminShell title="App Settings">
      <AdminFormSection title="Mosque and app settings placeholder">
        <FormField label="mosqueName" value={mosqueSettings.mosqueName} />
        <FormField label="address" value={mosqueSettings.address} />
        <FormField label="phone" value={mosqueSettings.phone} />
        <FormField label="email" value={mosqueSettings.email} />
        <FormField label="googleMapsLink" value={mosqueSettings.googleMapsLink} />
        <FormField label="defaultTimezone" value="Europe/Berlin" />
      </AdminFormSection>
    </AdminShell>
  );
}
