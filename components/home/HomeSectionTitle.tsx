import type { ReactNode } from "react";

export function HomeSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-lg font-bold text-[var(--home-text)]">{children}</h2>;
}
