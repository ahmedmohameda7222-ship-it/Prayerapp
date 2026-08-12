import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, BookOpenCheck, MoonStar, Sunrise } from "lucide-react";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import type { SmartNextAction } from "@/lib/home-utils";
import { useTranslation } from "@/lib/i18n/use-translation";

const actionConfig = {
  afterPrayer: { href: "/azkar?tab=After Prayer", icon: BookOpenCheck },
  morning: { href: "/azkar?tab=Morning", icon: Sunrise },
  evening: { href: "/azkar?tab=Evening", icon: BookOpenCheck },
  sleep: { href: "/azkar?tab=Sleep", icon: MoonStar },
  friday: { href: "/friday", icon: MosqueIcon },
} satisfies Record<SmartNextAction, { href: string; icon: ComponentType<{ className?: string }> }>;

export function SmartNextActionCard({ action }: { action: SmartNextAction }) {
  const { t } = useTranslation();
  const { href, icon: Icon } = actionConfig[action];

  return (
    <Link href={href} className="card group flex items-center gap-3 p-4 transition active:scale-[0.99]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--color-gold-dark)]">{t(`phase1.smartLabels.${action}`)}</p>
        <h3 className="font-bold text-[var(--color-emerald)]">{t(`home.smartActions.${action}.title`)}</h3>
        <p className="text-sm leading-5 text-[var(--color-muted)]">{t(`home.smartActions.${action}.description`)}</p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-[var(--color-muted)] transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}
