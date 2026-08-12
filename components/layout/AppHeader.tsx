"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { LanguageMenu } from "@/components/home/LanguageMenu";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { todayIso, formatHijriDate, formatLongDate } from "@/lib/date-utils";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AppHeader({ title = "Masjid El-Rahman" }: { title?: string }) {
  const { t, locale } = useTranslation();
  const { user } = usePublicAuth();
  const currentDateIso = todayIso();
  const currentDate = formatLongDate(currentDateIso, locale);
  const hijriDate = formatHijriDate(currentDateIso, locale);

  return (
    <header className="home-app-header border-b border-[var(--home-divider)] bg-[var(--home-surface)]">
      <div className="home-app-header-chrome bg-[var(--home-brand)] px-4 pb-4 text-white sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 pt-1">
            <h1 className="text-[21px] font-bold leading-[1.2]">{title}</h1>
            <p className="mt-1.5 text-[13px] font-semibold text-white/75">Deggendorf</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <LanguageMenu />
            <NotificationButton home />
            <Link
              href={user ? "/account" : "/account/sign-in"}
              aria-label={t("phase1.account")}
              className="grid h-11 w-11 place-items-center rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-white/80">
          <time dateTime={currentDateIso}>{currentDate}</time>
          <span aria-hidden="true">·</span>
          <span>{hijriDate}</span>
        </div>
      </div>

      <div className="px-4 py-5 text-center sm:px-5">
        <p dir="rtl" lang="ar" className="home-quran-text text-[20px] font-semibold leading-[1.85] text-[var(--home-brand-strong)]">
          إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
        </p>
        <p dir="rtl" lang="ar" className="mt-1 text-xs font-semibold text-[var(--home-text-secondary)]">النساء: 103</p>
      </div>
    </header>
  );
}
