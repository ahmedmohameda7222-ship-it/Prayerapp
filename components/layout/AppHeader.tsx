"use client";

import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { todayIso, formatHijriDate, formatLongDate } from "@/lib/date-utils";
import { getTextDirection } from "@/lib/i18n/direction";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AppHeader({ title = "Deggendorf Prayer" }: { title?: string }) {
  const { locale } = useTranslation();
  const currentDateIso = todayIso();
  const currentDate = formatLongDate(currentDateIso, locale);
  const hijriDate = formatHijriDate(currentDateIso, locale);

  return (
    <header className="app-header-banner relative mb-4 overflow-hidden rounded-b-[36px] shadow-[var(--shadow-card)]">
      <div className="sr-only">
        <h1>{title}</h1>
        <p>Prayer times for the city of Deggendorf.</p>
        <p>Indeed, prayer has been decreed upon the believers at specified times. Quran 4:103.</p>
      </div>
      <Image
        src="/assets/app-header-arch-background.png"
        alt=""
        width={1679}
        height={943}
        className="block h-auto w-full"
        sizes="100vw"
        preload
      />
      <div className="absolute end-3 top-3 sm:end-4 sm:top-4">
        <NotificationButton inverted />
      </div>
      <div dir="ltr" className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4">
        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-[var(--color-card)]/85 px-2 py-1.5 text-[9px] font-bold text-[var(--color-emerald-dark)] shadow-sm backdrop-blur-sm sm:gap-1.5 sm:px-3 sm:py-2 sm:text-xs">
          <MapPin size={13} className="shrink-0 text-[var(--color-gold-dark)] sm:h-4 sm:w-4" aria-hidden="true" />
          <span>Deggendorf, Germany</span>
        </div>
        <div dir={getTextDirection(locale)} className="flex min-w-0 items-start gap-1 rounded-xl bg-[var(--color-card)]/85 px-2 py-1.5 text-end font-bold text-[var(--color-emerald-dark)] shadow-sm backdrop-blur-sm sm:gap-1.5 sm:px-3 sm:py-2">
          <Calendar size={13} className="mt-0.5 shrink-0 text-[var(--color-gold-dark)] sm:h-4 sm:w-4" aria-hidden="true" />
          <span className="flex min-w-0 flex-col items-end leading-tight">
            <time dateTime={currentDateIso} className="text-[8px] sm:text-xs">{currentDate}</time>
            <span className="mt-0.5 text-[7px] text-[var(--color-gold-dark)] sm:text-[11px]">{hijriDate}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
