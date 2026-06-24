import type { ReactNode } from "react";

export function PatternedCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card patterned p-4 text-[var(--color-emerald)] ${className}`}>{children}</section>;
}
