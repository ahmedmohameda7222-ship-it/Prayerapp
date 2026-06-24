import { AdminShell } from "@/components/layout/AdminShell";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { AdminTable } from "@/components/admin/AdminTable";
import { FormField } from "@/components/admin/FormField";
import { events } from "@/lib/mock-data";

export default function AdminEventsPage() {
  return (
    <AdminShell title="Events Management">
      <div className="grid gap-5">
        <AdminFormSection title="Event placeholder editor">
          <FormField label="title" value={events[0].title} />
          <FormField label="date" value={events[0].date} type="date" />
          <FormField label="start_time" value={events[0].startTime} type="time" />
          <FormField label="end_time" value={events[0].endTime} type="time" />
          <FormField label="location" value={events[0].location} />
          <FormField label="description" value={events[0].description} />
        </AdminFormSection>
        <AdminTable headers={["Title", "Date", "Time", "Location", "Type"]} rows={events.map((event) => [event.title, event.date, `${event.startTime}-${event.endTime}`, event.location, event.type])} />
      </div>
    </AdminShell>
  );
}
