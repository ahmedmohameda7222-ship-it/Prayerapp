"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { LanguageMenu } from "@/components/home/LanguageMenu";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { todayIso, formatHijriDate, formatLongDate } from "@/lib/date-utils";
import { useTranslation } from "@/lib/i18n/use-translation";

const localizedMosqueNames = {
  ar: "مسجد الرحمن",
  en: "Masjid El-Rahman",
  de: "El-Rahman-Moschee",
  tr: "El-Rahman Camii",
};

export function HomeIdentityHeader() {
  const { t, locale } = useTranslation();
  const { user } = usePublicAuth();
  const currentDateIso = todayIso();
  const currentDate = formatLongDate(currentDateIso, locale);
  const hijriDate = formatHijriDate(currentDateIso, locale);
  const mosqueName = localizedMosqueNames[locale];

  return (
    <header className="home-app-header border-b border-[var(--home-divider)] bg-[var(--home-surface)]">
      <div className="home-app-header-chrome bg-[var(--home-brand)] px-4 pb-5 pt-2 text-white sm:px-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center" dir="ltr">
          <Link
            href={user ? "/account" : "/account/sign-in"}
            aria-label={t("phase1.account")}
            className="grid h-11 w-11 place-items-center justify-self-start rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
          >
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </Link>
          <span aria-hidden="true" />
          <div className="flex shrink-0 items-center justify-self-end gap-1">
            <LanguageMenu />
            <NotificationButton home />
          </div>
        </div>

        <div className="mt-1 text-center">
          <h1
            lang={locale}
            className={`${locale === "ar" ? "home-quran-text text-[32px] leading-[1.35]" : "text-[28px] leading-tight"} font-bold text-[#F2EBDD]`}
          >
            {mosqueName}
          </h1>
          <p className="mt-1 text-[13px] font-semibold text-[rgba(255,255,255,0.78)]">Deggendorf</p>
        </div>

        <div className="mt-4 grid grid-cols-2 items-center gap-4 text-[13px] font-semibold text-[rgba(255,255,255,0.82)]" dir="ltr">
          <span className="text-left" data-testid="header-hijri-date">{hijriDate}</span>
          <time className="text-right" dateTime={currentDateIso} data-testid="header-gregorian-date">{currentDate}</time>
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
