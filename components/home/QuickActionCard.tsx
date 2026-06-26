import Link from "next/link";
import type { ComponentType } from "react";
import { ChevronRight } from "lucide-react";

export function QuickActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="card flex items-center gap-3 p-4 transition active:scale-[0.98]">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-emerald)] text-[var(--color-gold)] shadow-[var(--shadow-card)]">
        <Icon className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-[var(--color-emerald)]">{title}</h3>
        <p className="text-sm leading-5 text-[var(--color-muted)]">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-[var(--color-muted)]" />
    </Link>
  );
}
