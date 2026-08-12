import Link from "next/link";
import type { ComponentType } from "react";
import { BookOpenCheck, MoonStar, Sunrise } from "lucide-react";
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
    <Link href={href} className="flex min-h-20 items-center gap-3 border-y border-[var(--home-divider)] py-4 transition-colors hover:bg-[var(--home-surface-subtle)] active:bg-[var(--home-brand-soft)]">
      <Icon className="h-6 w-6 shrink-0 text-[var(--home-brand)]" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--home-text-secondary)]">{t(`phase1.smartLabels.${action}`)}</p>
        <h3 className="text-base font-bold text-[var(--home-text)]">{t(`home.smartActions.${action}.title`)}</h3>
        <p className="text-sm leading-5 text-[var(--home-text-secondary)]">{t(`home.smartActions.${action}.description`)}</p>
      </div>
    </Link>
  );
}
