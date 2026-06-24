import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export function AdminFormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
      <div className="mt-5 flex gap-3">
        <Button>Save</Button>
        <Button variant="ghost">Cancel</Button>
      </div>
    </section>
  );
}
