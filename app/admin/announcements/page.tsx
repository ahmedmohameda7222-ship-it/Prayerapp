import { AdminShell } from "@/components/layout/AdminShell";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { AdminTable } from "@/components/admin/AdminTable";
import { FormField } from "@/components/admin/FormField";
import { announcements } from "@/lib/mock-data";

export default function AdminAnnouncementsPage() {
  return (
    <AdminShell title="Announcements Management">
      <div className="grid gap-5">
        <AdminFormSection title="Create Announcement">
          <FormField label="title" value="Friday location update" />
          <FormField label="type" value="Location update" />
          <FormField label="message" value="Write announcement content here." />
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]"><input type="checkbox" className="h-5 w-5 accent-[var(--color-emerald)]" /> Mark urgent</label>
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]"><input type="checkbox" defaultChecked className="h-5 w-5 accent-[var(--color-emerald)]" /> Published flag</label>
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]"><input type="checkbox" className="h-5 w-5 accent-[var(--color-emerald)]" /> Send notification placeholder</label>
        </AdminFormSection>
        <AdminTable
          headers={["Title", "Type", "Urgent", "Published", "Edit", "Delete"]}
          rows={announcements.map((item) => [item.title, item.type, String(item.isUrgent), String(item.published), "Edit placeholder", "Delete placeholder"])}
        />
      </div>
    </AdminShell>
  );
}
