"use client";

import Image from "next/image";
import { MapPin, Calendar } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getTextDirection } from "@/lib/i18n/direction";
import { todayIso, formatHijriDate, formatLongDate } from "@/lib/date-utils";

export function AppHeader({ title = "Deggendorf Prayer" }: { title?: string }) {
  const { locale } = useTranslation();
  const currentDateIso = todayIso();
  const currentDate = formatLongDate(currentDateIso, locale);
  const hijriDate = formatHijriDate(currentDateIso, locale);

  return (
    <header className="app-header-banner relative mb-4 overflow-hidden rounded-b-[36px] shadow-[var(--shadow-card)]">
      {/* Background image — fills the entire header */}
      <div className="absolute inset-0">
        <Image
          src="/assets/app-header-arch-background.png"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>

      {/* Dark overlay for premium readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-emerald-dark)]/70 via-[var(--color-emerald)]/25 to-[var(--color-emerald-dark)]/60" />

      {/* Notification button — top end, adapts to RTL naturally */}
      <div className="relative flex justify-end p-4">
        <NotificationButton inverted />
      </div>

      {/* Centered mosque logo + title + Arabic subtitle */}
      <div className="relative flex flex-col items-center px-6 pb-2">
        <div className="relative h-24 w-24 rounded-full bg-transparent sm:h-28 sm:w-28">
          <Image
            src="/assets/app-header-mosque-logo.png"
            alt="Mosque logo"
            fill
            className="object-contain drop-shadow-lg"
            sizes="(min-width: 640px) 112px, 96px"
            priority
          />
        </div>

        <h1 className="font-brand mt-3 text-center text-[22px] font-semibold leading-tight text-white drop-shadow-sm sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 text-center text-sm font-medium text-[var(--color-gold-soft)]">
          مواقيت الصلاة لمدينة ديغندورف
        </p>
      </div>

      {/* Bottom info row: location + date — separate, no card */}
      <div dir="ltr" className="relative mx-4 mb-5 mt-4 flex items-end justify-between gap-3 sm:mx-6">
        <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-white/90">
          <MapPin size={14} className="shrink-0 text-[var(--color-gold)]" />
          <span>Deggendorf, Germany</span>
        </div>
        <div dir={getTextDirection(locale)} className="flex min-w-0 items-start justify-end gap-1.5 text-end font-medium text-white/90">
          <Calendar size={14} className="mt-0.5 shrink-0 text-[var(--color-gold)]" aria-hidden="true" />
          <span className="flex min-w-0 flex-col items-end leading-tight">
            <time dateTime={currentDateIso} className="text-[11px] sm:text-xs">{currentDate}</time>
            <span className="mt-1 text-[10px] text-[var(--color-gold-soft)] sm:text-[11px]">{hijriDate}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
