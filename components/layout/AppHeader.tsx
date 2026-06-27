"use client";

import Image from "next/image";
import { MapPin, Calendar } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useTranslation } from "@/lib/i18n/use-translation";
import { todayIso, formatLongDate } from "@/lib/date-utils";

export function AppHeader({ title = "Deggendorf Prayer" }: { title?: string }) {
  const { locale } = useTranslation();
  const currentDate = formatLongDate(todayIso(), locale);

  return (
    <header className="relative mb-4 overflow-hidden rounded-b-[36px] shadow-[var(--shadow-card)]">
      {/* Background image — fills the entire header */}
      <div className="absolute inset-0">
        <Image
          src="/assets/app-header-arch-background.png"
          alt=""
          fill
          className="object-cover"
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
        <div className="relative h-24 w-24 sm:h-28 sm:w-28">
          <Image
            src="/assets/app-header-mosque-logo.png"
            alt="Mosque logo"
            fill
            className="object-contain drop-shadow-lg"
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

      {/* Bottom info pill: location + dynamic date */}
      <div className="relative mx-4 mb-5 mt-4 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-md sm:mx-6">
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/90">
          <MapPin size={14} className="shrink-0 text-[var(--color-gold)]" />
          <span>Deggendorf, Germany</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/90">
          <Calendar size={14} className="shrink-0 text-[var(--color-gold)]" />
          <span>{currentDate}</span>
        </div>
      </div>
    </header>
  );
}
