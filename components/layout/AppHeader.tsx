"use client";

import { getImageProps } from "next/image";
import { Calendar, MapPin } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { LanguageMenu } from "@/components/home/LanguageMenu";
import { todayIso, formatHijriDate, formatLongDate } from "@/lib/date-utils";
import { getTextDirection } from "@/lib/i18n/direction";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AppHeader({ title = "Masjid El-Rahman" }: { title?: string }) {
  const { locale } = useTranslation();
  const currentDateIso = todayIso();
  const currentDate = formatLongDate(currentDateIso, locale);
  const hijriDate = formatHijriDate(currentDateIso, locale);
  const commonImageProps = {
    alt: "",
    sizes: "(max-width: 639px) 100vw, (max-width: 1023px) calc(100vw - 32px), 960px",
  };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    ...commonImageProps,
    src: "/assets/app-header-arch-background-desktop-v2.png",
    width: 2020,
    height: 779,
  });
  const {
    props: { srcSet: mobileSrcSet, ...mobileImageProps },
  } = getImageProps({
    ...commonImageProps,
    src: "/assets/app-header-arch-background-mobile-v2.png",
    width: 1254,
    height: 1254,
  });

  return (
    <header className="app-header-banner relative mb-5 overflow-hidden rounded-b-[32px] shadow-[var(--shadow-card)]">
      <div className="sr-only">
        <h1>{title}</h1>
        <p>Prayer times for the city of Deggendorf.</p>
        <p>Indeed, prayer has been decreed upon the believers at specified times. Quran 4:103.</p>
      </div>
      <picture>
        <source media="(min-width: 640px)" srcSet={desktopSrcSet} />
        <source media="(max-width: 639px)" srcSet={mobileSrcSet} />
        <img {...mobileImageProps} alt="" className="block aspect-square h-auto w-full sm:aspect-[2020/779]" fetchPriority="high" />
      </picture>
      <div className="absolute start-3 top-3 sm:start-4 sm:top-4">
        <LanguageMenu />
      </div>
      <div className="absolute end-3 top-3 sm:end-4 sm:top-4">
        <NotificationButton inverted />
      </div>
      <div aria-hidden="true" className="absolute left-1/2 top-[38%] flex w-[68%] -translate-x-1/2 flex-col items-center text-center text-[var(--color-gold-soft)] sm:top-[39%] sm:w-[54%]">
        <h2 className="font-brand text-[clamp(17px,4.4vw,19px)] font-semibold leading-tight drop-shadow-md sm:text-[clamp(24px,2.2vw,31px)]">{title}</h2>
        <p className="mt-1 text-[clamp(9px,2.4vw,11px)] font-bold sm:mt-1.5 sm:text-[clamp(10px,1vw,13px)]">مواقيت الصلاة لمدينة ديغندورف</p>
        <span className="mt-1.5 h-px w-2/3 bg-[var(--color-gold)]/65 sm:mt-2 sm:w-1/2" />
        <p className="mt-2 text-[clamp(11px,2.9vw,13px)] font-semibold leading-[1.45] drop-shadow-sm sm:mt-2.5 sm:text-[clamp(13px,1.25vw,16px)] sm:leading-[1.5]">إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا</p>
        <p className="mt-0.5 text-[8px] font-bold text-[var(--color-gold)] sm:text-[10px]">النساء: 103</p>
      </div>
      <div dir="ltr" className="absolute inset-x-2 bottom-1.5 flex items-end justify-between gap-2 sm:inset-x-5 sm:bottom-3">
        <div className="flex shrink-0 items-center gap-1 px-1 py-0.5 text-[9px] font-bold text-[var(--color-emerald-dark)] drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] sm:gap-1.5 sm:px-2 sm:py-1 sm:text-xs">
          <MapPin size={13} className="shrink-0 text-[var(--color-gold-dark)] sm:h-4 sm:w-4" aria-hidden="true" />
          <span>Deggendorf, Germany</span>
        </div>
        <div dir={getTextDirection(locale)} className="flex min-w-0 items-start gap-1 px-1 py-0.5 text-end font-bold text-[var(--color-emerald-dark)] drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] sm:gap-1.5 sm:px-2 sm:py-1">
          <Calendar size={13} className="mt-0.5 shrink-0 text-[var(--color-gold-dark)] sm:h-4 sm:w-4" aria-hidden="true" />
          <span className="flex min-w-0 flex-col items-end leading-tight">
            <time dateTime={currentDateIso} className="text-[9px] sm:text-xs">{currentDate}</time>
            <span className="mt-0.5 text-[8px] text-[var(--color-gold-dark)] sm:text-[11px]">{hijriDate}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
