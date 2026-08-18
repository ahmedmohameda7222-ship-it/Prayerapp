"use client";

import Link from "next/link";
import { MapPin, UserRound } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { LanguageMenu } from "@/components/home/LanguageMenu";
import { HomeInstallAction } from "@/components/home/HomeInstallAction";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { todayIso, formatHijriDate, formatLongDate } from "@/lib/date-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import { APP_NAMES } from "@/lib/app-brand";

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L4 20l1.1-4A8.2 8.2 0 1 1 20.2 11.7Z" />
      <path d="M9 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 2c.1.3 0 .5-.2.7l-.6.7c-.2.2-.1.4 0 .6.5.9 1.2 1.7 2.1 2.2.2.1.4.2.6 0l.8-.9c.2-.2.4-.3.7-.2l2 .9c.3.1.4.3.4.5 0 .4-.2 1.3-.7 1.8-.5.5-1.3.8-2.1.7-1.1-.1-2.5-.6-4-1.8-1.7-1.4-2.9-3.2-3.3-4.5-.3-1-.1-1.9.3-2.5.4-.5.9-.7 1.5-.7Z" />
    </svg>
  );
}

type AppHeaderProps = {
  title?: string;
  whatsappLink?: string;
  googleMapsLink?: string;
};

export function AppHeader({ title, whatsappLink, googleMapsLink }: AppHeaderProps) {
  const { t, locale } = useTranslation();
  const { user } = usePublicAuth();
  const currentDateIso = todayIso();
  const currentDate = formatLongDate(currentDateIso, locale);
  const hijriDate = formatHijriDate(currentDateIso, locale);
  const mosqueName = title || APP_NAMES[locale];
  const whatsappHref = whatsappLink?.startsWith("https://") ? whatsappLink : undefined;
  const mapsHref = googleMapsLink?.startsWith("https://") ? googleMapsLink : undefined;

  return (
    <header className="home-app-header border-b border-[var(--home-divider)] bg-[var(--home-surface)]">
      <div className="home-app-header-chrome bg-[var(--home-brand)] px-4 pb-5 pt-2 text-white sm:px-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center" dir="ltr">
          <div className="flex items-center justify-self-start gap-0.5">
            <Link
              href={user ? "/account" : "/account/sign-in"}
              aria-label={t("phase1.account")}
              className="grid h-11 w-11 place-items-center rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </Link>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                aria-label={t("mosque.whatsapp")}
                className="grid h-11 w-11 place-items-center rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
            ) : null}
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                aria-label={t("mosque.googleMaps")}
                className="grid h-11 w-11 place-items-center rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
              >
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <span aria-hidden="true" />
          <div className="flex shrink-0 items-center justify-self-end gap-1">
            <HomeInstallAction />
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
