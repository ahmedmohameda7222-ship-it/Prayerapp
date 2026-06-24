import { AdminShell } from "@/components/layout/AdminShell";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { AdminTable } from "@/components/admin/AdminTable";
import { FormField } from "@/components/admin/FormField";
import { ramadanDays } from "@/lib/mock-data";

export default function AdminRamadanPage() {
  const day = ramadanDays[0];
  return (
    <AdminShell title="Ramadan Management">
      <div className="grid gap-5">
        <AdminFormSection title="Ramadan day placeholder editor">
          <FormField label="date" value={day.date} type="date" />
          <FormField label="imsak" value={day.imsak} type="time" />
          <FormField label="fajr" value={day.fajr} type="time" />
          <FormField label="iftar" value={day.iftar} type="time" />
          <FormField label="taraweeh" value={day.taraweeh} type="time" />
          <FormField label="note" value={day.note} />
        </AdminFormSection>
        <AdminTable headers={["Day", "Date", "Imsak", "Fajr", "Iftar / Maghrib", "Taraweeh"]} rows={ramadanDays.map((item) => [item.ramadanDay, item.date, item.imsak, item.fajr, item.iftar, item.taraweeh])} />
      </div>
    </AdminShell>
  );
}
