import { AdminShell } from "@/components/layout/AdminShell";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { AdminTable } from "@/components/admin/AdminTable";
import { FormField } from "@/components/admin/FormField";
import { AdminWarningCard } from "@/components/admin/AdminWarningCard";
import { prayerTimes } from "@/lib/mock-data";

export default function AdminPrayerTimesPage() {
  const day = prayerTimes[2];
  return (
    <AdminShell title="Prayer Times Management">
      <div className="grid gap-5">
        <AdminWarningCard message="Prayer times for next week are missing." />
        <AdminFormSection title="Daily Editor">
          <FormField label="date" value={day.date} type="date" />
          <FormField label="fajr" value={day.fajr} type="time" />
          <FormField label="sunrise" value={day.sunrise} type="time" />
          <FormField label="dhuhr" value={day.dhuhr} type="time" />
          <FormField label="asr" value={day.asr} type="time" />
          <FormField label="maghrib" value={day.maghrib} type="time" />
          <FormField label="isha" value={day.isha} type="time" />
          <FormField label="fajr_iqama" value={day.fajrIqama} type="time" />
          <FormField label="dhuhr_iqama" value={day.dhuhrIqama} type="time" />
          <FormField label="asr_iqama" value={day.asrIqama} type="time" />
          <FormField label="maghrib_iqama" value={day.maghribIqama} type="time" />
          <FormField label="isha_iqama" value={day.ishaIqama} type="time" />
          <FormField label="note" value={day.note} />
        </AdminFormSection>
        <div className="admin-grid">
          {["Weekly editor placeholder", "Monthly editor placeholder", "CSV import placeholder"].map((title) => (
            <section key={title} className="card p-4">
              <h2 className="font-bold text-[var(--color-emerald)]">{title}</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">This area is ready for backend connection later.</p>
            </section>
          ))}
        </div>
        <AdminTable
          headers={["date", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha", "fajr_iqama", "dhuhr_iqama", "asr_iqama", "maghrib_iqama", "isha_iqama", "note"]}
          rows={prayerTimes.map((time) => [time.date, time.fajr, time.sunrise, time.dhuhr, time.asr, time.maghrib, time.isha, time.fajrIqama ?? "", time.dhuhrIqama ?? "", time.asrIqama ?? "", time.maghribIqama ?? "", time.ishaIqama ?? "", time.note ?? ""])}
        />
      </div>
    </AdminShell>
  );
}
