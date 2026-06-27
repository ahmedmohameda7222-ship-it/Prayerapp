"use client";

import Image from "next/image";
import { MapPin, Calendar } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getTextDirection } from "@/lib/i18n/direction";
import { todayIso, formatHijriDate, formatLongDate } from "@/lib/date-utils";

export function AppHeader() {
  const { locale } = useTranslation();
  const currentDateIso = todayIso();
  const currentDate = formatLongDate(currentDateIso, locale);
  const hijriDate = formatHijriDate(currentDateIso, locale);

  return (
    <header className="app-header-banner relative mb-4 overflow-hidden rounded-b-[36px] shadow-[var(--shadow-card)]">
      {/* Background image — fills the entire header, already contains logo, title, and verse */}
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

      {/* Subtle overlay for readability of UI elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />

      {/* Notification button — top end, adapts to RTL naturally */}
      <div className="relative flex justify-end p-4">
        <NotificationButton inverted />
      </div>

      {/* Spacer for the image content (logo, title, verse are already in the image) */}
      <div className="relative h-48 sm:h-56" />

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
