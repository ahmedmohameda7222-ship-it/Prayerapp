import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "gold" | "ghost" | "soft";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-emerald)] text-[var(--color-card)] shadow-[var(--shadow-card)]",
  gold: "bg-gradient-to-br from-[var(--color-gold)] to-[#f3d98b] text-[var(--color-emerald-dark)] shadow-[var(--shadow-gold)]",
  ghost: "border border-[var(--color-border)] bg-transparent text-[var(--color-emerald)]",
  soft: "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]",
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: Variant }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
