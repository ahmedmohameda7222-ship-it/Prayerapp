"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, UserRound } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { LanguageMenu } from "@/components/home/LanguageMenu";
import { HomeInstallAction } from "@/components/home/HomeInstallAction";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { FormattedHijriDate } from "@/components/ui/FormattedHijriDate";
import { todayIso, formatLongDate } from "@/lib/date-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import { APP_NAMES, ASSOCIATION_NAME } from "@/lib/app-brand";
import { safeExternalUrl } from "@/lib/public-links";

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
  const mosqueName = title || APP_NAMES[locale];
  const useArabicBrandLogo = !title && locale === "ar";
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
          {useArabicBrandLogo ? (
            <h1 lang="ar" className="flex justify-center">
              <Image
                src="/branding/masjid-al-danube-ar.svg"
                alt="مَسْجِدُ الدُّونَاوْ"
                width={230}
                height={77}
                priority
                className="mosque-name-logo h-auto w-[clamp(190px,54vw,230px)]"
              />
            </h1>
          ) : (
            <h1 lang={locale} className="text-[28px] font-bold leading-tight text-[#F2EBDD]">
              {mosqueName}
            </h1>
          )}
          <p className="home-app-header-association-name mx-auto mt-2 max-w-[min(88vw,520px)] break-words text-[14px] font-medium leading-snug text-[rgba(255,255,255,0.88)] sm:text-[15px]">
            {ASSOCIATION_NAME}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-[rgba(255,255,255,0.72)]">Deggendorf</p>
        </div>

        <div className="mt-4 grid grid-cols-2 items-center gap-4 text-[13px] font-semibold text-[rgba(255,255,255,0.82)]" dir="ltr">
          <span className="text-left" data-testid="header-hijri-date">
            <FormattedHijriDate date={currentDateIso} locale={locale} />
          </span>
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
