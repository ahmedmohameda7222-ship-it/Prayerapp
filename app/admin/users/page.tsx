import { AdminShell } from "@/components/layout/AdminShell";
import { AdminTable } from "@/components/admin/AdminTable";
import { userRoles } from "@/lib/mock-data";

export default function AdminUsersPage() {
  return (
    <AdminShell title="Users & Roles">
      <div className="grid gap-5">
        <section className="card p-4">
          <h2 className="font-bold text-[var(--color-emerald)]">Roles placeholder</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Authentication is intentionally not implemented yet. Roles are modeled for a future Supabase connection.</p>
        </section>
        <AdminTable headers={["Role", "Scope"]} rows={userRoles.map((role) => [role, "Placeholder permissions"])} />
      </div>
    </AdminShell>
  );
}
