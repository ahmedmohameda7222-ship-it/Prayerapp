import type { ReactNode } from "react";

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex h-3.5 w-3.5 rotate-45 items-center justify-center rounded-[2px] border border-[var(--color-gold)]"
        >
          <span className="h-1 w-1 rounded-[1px] bg-[var(--color-gold)]" />
        </span>
        <h2 className="text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]">{children}</h2>
      </div>
      {action}
    </div>
  );
}
