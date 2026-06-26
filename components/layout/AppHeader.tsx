"use client";

import Image from "next/image";
import { Bell } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AppHeader({ title = "Deggendorf Prayer" }: { title?: string }) {
  const { t } = useTranslation();
  return (
    <header className="mb-5 grid grid-cols-[48px_1fr_48px] items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-emerald)] shadow-[var(--shadow-card)]">
        <Image src="/assets/app-icon-main.png" alt={t("common.appIconAlt")} width={34} height={34} className="rounded-full" priority />
      </div>
      <h1 className="font-brand text-center text-[22px] font-semibold text-[var(--color-emerald)]">{title}</h1>
      <button aria-label={t("common.notifications")} className="grid h-12 w-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-emerald)] shadow-[var(--shadow-soft)]">
        <Bell className="h-5 w-5" />
      </button>
    </header>
  );
}
