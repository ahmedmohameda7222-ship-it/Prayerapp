import type { ComponentType, ReactNode } from "react";

export function AdminStatCard({ label, value, icon: Icon, note }: { label: string; value: ReactNode; note?: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <section className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-[var(--color-muted)]">{label}</p>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-[var(--color-emerald)]">{value}</p>
      {note ? <p className="mt-1 text-sm text-[var(--color-muted)]">{note}</p> : null}
    </section>
  );
}
