import type { ReactNode } from "react";

export function HomeSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="home-section-title text-lg font-bold text-[var(--home-text)]">{children}</h2>;
}
