import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="admin-layout min-h-screen bg-[var(--color-cream)]">
      <AdminSidebar />
      <section className="p-4 lg:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--color-gold-dark)]">Mosque administration</p>
          <h1 className="font-brand text-3xl font-semibold text-[var(--color-emerald)]">{title}</h1>
        </div>
        {children}
      </section>
    </main>
  );
}
