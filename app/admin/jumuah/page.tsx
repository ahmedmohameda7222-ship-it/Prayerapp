import { AdminShell } from "@/components/layout/AdminShell";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { AdminTable } from "@/components/admin/AdminTable";
import { FormField } from "@/components/admin/FormField";
import { jumuahTimes } from "@/lib/mock-data";

export default function AdminJumuahPage() {
  const item = jumuahTimes[0];
  return (
    <AdminShell title="Jumu'ah Management">
      <div className="grid gap-5">
        <AdminFormSection title="Add / Edit Jumu'ah Time">
          <FormField label="khutbah_time" value={item.khutbahTime} type="time" />
          <FormField label="prayer_time" value={item.prayerTime} type="time" />
          <FormField label="location_name" value={item.locationName} />
          <FormField label="location_address" value={item.locationAddress} />
          <FormField label="khateeb_name" value={item.khateebName} />
          <FormField label="language" value={item.language} />
          <FormField label="notes" value={item.notes} />
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]">
            <input type="checkbox" defaultChecked={item.published} className="h-5 w-5 accent-[var(--color-emerald)]" />
            published flag
          </label>
        </AdminFormSection>
        <AdminTable
          headers={["date", "khutbah_time", "prayer_time", "location_name", "khateeb_name", "language", "published"]}
          rows={jumuahTimes.map((time) => [time.date, time.khutbahTime, time.prayerTime, time.locationName, time.khateebName, time.language, String(time.published)])}
        />
      </div>
    </AdminShell>
  );
}
