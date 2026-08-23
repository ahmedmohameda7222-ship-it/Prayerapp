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
import { safeExternalUrl } from "@/lib/public-links";

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
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
  const whatsappHref = safeExternalUrl(whatsappLink, "whatsapp");
  const mapsHref = safeExternalUrl(googleMapsLink, "maps");

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
            className={
              locale === "ar" && mosqueName === APP_NAMES.ar
                ? "mosque-name-thuluth text-[#F2EBDD]"
                : "text-[28px] font-bold leading-tight text-[#F2EBDD]"
            }
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
