"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useTranslation } from "@/lib/i18n/use-translation";

export function PageHeader({ title, titleKey, arch = false }: { title?: string; titleKey?: string; arch?: boolean }) {
  const { t } = useTranslation();
  const displayTitle = titleKey ? t(titleKey) : title || "";

  if (arch) {
    return (
      <header className="arch-header -mx-4 mb-5 px-4 pb-8 pt-5 text-[var(--color-card)]">
        <div className="relative z-10 grid grid-cols-[44px_1fr_44px] items-center">
          <Link href="/" aria-label={t("common.backHome")} className="grid h-11 w-11 place-items-center rounded-full bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-brand text-center text-3xl font-semibold">{displayTitle}</h1>
          <NotificationButton inverted />
        </div>
      </header>
    );
  }

  return (
    <header className="mb-5 grid grid-cols-[44px_1fr_44px] items-center">
      <Link href="/" aria-label={t("common.backHome")} className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-emerald)]">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h1 className="font-brand text-center text-3xl font-semibold text-[var(--color-emerald)]">{displayTitle}</h1>
      <NotificationButton />
    </header>
  );
}
