import { AdminShell } from "@/components/layout/AdminShell";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminWarningCard } from "@/components/admin/AdminWarningCard";
import { azkarItems } from "@/lib/mock-data";

export default function AdminAzkarPage() {
  return (
    <AdminShell title="Azkar & Duaa Management">
      <div className="grid gap-5">
        <AdminWarningCard message="Azkar content should be reviewed carefully before publishing." />
        <section className="card p-4">
          <h2 className="font-bold text-[var(--color-emerald)]">Static content placeholder</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Azkar content is static/mock data for now. User accounts are not implemented.</p>
        </section>
        <AdminTable headers={["Category", "Transliteration", "Repeat", "Source", "Published"]} rows={azkarItems.map((item) => [item.category, item.transliteration, item.repeatCount, item.source, String(item.isPublished)])} />
      </div>
    </AdminShell>
  );
}
