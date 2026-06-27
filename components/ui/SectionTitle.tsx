import type { ReactNode } from "react";

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-gold-soft)] drop-shadow-sm">{children}</h2>
      {action}
    </div>
  );
}
