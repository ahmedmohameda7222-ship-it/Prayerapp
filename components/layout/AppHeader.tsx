"use client";

import Link from "next/link";
import { Calendar, MapPin, UserRound } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { LanguageMenu } from "@/components/home/LanguageMenu";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { todayIso, formatHijriDate, formatLongDate } from "@/lib/date-utils";
import { phase1Copy } from "@/lib/i18n/phase1-copy";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AppHeader({ title = "Masjid El-Rahman" }: { title?: string }) {
  const { locale } = useTranslation();
  const { user } = usePublicAuth();
  const copy = phase1Copy[locale];
  const currentDateIso = todayIso();
  const currentDate = formatLongDate(currentDateIso, locale);
  const hijriDate = formatHijriDate(currentDateIso, locale);

  return (
    <header className="mb-5 overflow-hidden rounded-b-[28px] border-x border-b border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0">
          <h1 className="font-brand text-xl font-semibold leading-tight text-[var(--color-emerald)] sm:text-2xl">{title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[var(--color-muted)]">
            <MapPin className="h-3.5 w-3.5 text-[var(--color-gold-dark)]" aria-hidden="true" />
            Deggendorf
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageMenu />
          <NotificationButton />
          <Link
            href={user ? "/account" : "/account/sign-in"}
            aria-label={copy.account}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-emerald)] shadow-[var(--shadow-soft)]"
          >
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-[var(--color-border)] bg-[var(--color-cream)] px-4 py-2 text-xs font-bold text-[var(--color-charcoal)] sm:px-5">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-[var(--color-gold-dark)]" aria-hidden="true" />
          <time dateTime={currentDateIso}>{currentDate}</time>
        </span>
        <span className="text-[var(--color-gold-dark)]">{hijriDate}</span>
      </div>

      <div className="px-4 py-3 text-center sm:px-5">
        <p dir="rtl" lang="ar" className="text-[15px] font-semibold leading-7 text-[var(--color-emerald-dark)] sm:text-base">
          إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
        </p>
        <p className="mt-0.5 text-[11px] font-bold text-[var(--color-gold-dark)]">Quran 4:103</p>
      </div>
    </header>
  );
}
