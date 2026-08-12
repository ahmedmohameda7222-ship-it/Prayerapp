"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight, Compass, HandHeart, Landmark, Moon, Settings, Shield, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { phase1Copy } from "@/lib/i18n/phase1-copy";
import { useTranslation } from "@/lib/i18n/use-translation";

const items = [
  ["/donations", "donations.title", HandHeart],
  ["/azkar", "azkar.title", BookOpen],
  ["/ramadan", "ramadan.title", Moon],
  ["/events", "events.title", CalendarDays],
  ["/mosque", "mosque.title", Landmark],
  ["/qibla", "qibla.title", Compass],
  ["/settings", "settings.title", Settings],
] as const;

export default function MorePage() {
  const { t, locale } = useTranslation();
  const copy = phase1Copy[locale];
  const phase1Items = [
    { href: "/account", label: copy.account, Icon: UserRound },
    { href: "/privacy", label: copy.privacy, Icon: Shield },
  ];

  return (
    <AppShell>
      <PageHeader titleKey="nav.more" />
      <div className="grid gap-3 lg:grid-cols-2">
        {phase1Items.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="card flex min-h-16 items-center gap-3 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-emerald)] text-[var(--color-gold)]"><Icon className="h-6 w-6" /></div>
            <span className="flex-1 font-bold text-[var(--color-emerald)]">{label}</span>
            <ChevronRight className="h-5 w-5 text-[var(--color-muted)] rtl:rotate-180" />
          </Link>
        ))}
        {items.map(([href, labelKey, Icon]) => (
          <Link key={href} href={href} className="card flex min-h-16 items-center gap-3 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-emerald)] text-[var(--color-gold)]"><Icon className="h-6 w-6" /></div>
            <span className="flex-1 font-bold text-[var(--color-emerald)]">{t(labelKey)}</span>
            <ChevronRight className="h-5 w-5 text-[var(--color-muted)] rtl:rotate-180" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
