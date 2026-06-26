import type { ReactNode } from "react";

export function Badge({ children, tone = "emerald" }: { children: ReactNode; tone?: "emerald" | "gold" | "muted" | "danger" }) {
  const tones = {
    emerald: "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]",
    gold: "bg-[var(--color-gold-soft)] text-[var(--color-gold-dark)]",
    muted: "bg-[var(--color-cream-deep)] text-[var(--color-muted)]",
    danger: "bg-red-50 text-[var(--color-danger)]",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}
