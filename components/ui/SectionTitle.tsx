import type { ReactNode } from "react";

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="section-title text-sm font-extrabold uppercase tracking-[0.04em] text-[#171a18]">{children}</h2>
      {action}
    </div>
  );
}
