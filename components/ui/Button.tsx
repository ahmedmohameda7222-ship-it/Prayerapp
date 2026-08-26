import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "gold" | "ghost" | "soft";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--ui-brand)] text-[var(--ui-surface)] shadow-[var(--shadow-card)]",
  gold: "bg-gradient-to-br from-[var(--ui-brass)] to-[var(--ui-brass-soft)] text-[var(--ui-brand-strong)] shadow-[var(--shadow-gold)]",
  ghost: "border border-[var(--ui-divider)] bg-transparent text-[var(--ui-brand)]",
  soft: "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]",
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: Variant }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--ui-radius-control)] px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
