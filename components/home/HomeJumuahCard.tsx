"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { FormattedTime } from "@/components/ui/FormattedTime";
import { formatShortDate } from "@/lib/date-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { HomeJumuahSchedule } from "@/lib/home-jumuah";
import type { Locale } from "@/lib/i18n/types";

const COPY = {
  ar: {
    title: "صلاة الجمعة",
    multiple: "تُقام صلاة الجمعة في المسجد في عدة مواعيد.",
    single: "تُقام صلاة الجمعة في المسجد في الموعد التالي.",
    today: "الجمعة اليوم",
    tomorrow: "الجمعة غدًا",
    twoDays: "الجمعة بعد يومين",
    upcoming: "الجمعة القادمة",
    prayer: "الصلاة",
    arrive: "يرجى الحضور مبكرًا قبل موعد الصلاة.",
    view: "عرض تفاصيل الجمعة",
  },
  en: {
    title: "Jumu'ah Prayer",
    multiple: "Jumu'ah prayer is held at the mosque at several times.",
    single: "Jumu'ah prayer is held at the mosque at the following time.",
    today: "Jumu'ah today",
    tomorrow: "Jumu'ah tomorrow",
    twoDays: "Jumu'ah in two days",
    upcoming: "Upcoming Jumu'ah",
    prayer: "Prayer",
    arrive: "Please arrive early before the prayer time.",
    view: "View Friday details",
  },
  de: {
    title: "Freitagsgebet",
    multiple: "Das Freitagsgebet findet in der Moschee zu mehreren Zeiten statt.",
    single: "Das Freitagsgebet findet in der Moschee zu folgender Zeit statt.",
    today: "Freitagsgebet heute",
    tomorrow: "Freitagsgebet morgen",
    twoDays: "Freitagsgebet in zwei Tagen",
    upcoming: "Nächstes Freitagsgebet",
    prayer: "Gebet",
    arrive: "Bitte kommen Sie rechtzeitig vor dem Gebet.",
    view: "Freitagsdetails anzeigen",
  },
  tr: {
    title: "Cuma Namazı",
    multiple: "Cuma namazı camide birden fazla saatte kılınır.",
    single: "Cuma namazı camide aşağıdaki saatte kılınır.",
    today: "Cuma bugün",
    tomorrow: "Cuma yarın",
    twoDays: "Cuma iki gün sonra",
    upcoming: "Yaklaşan Cuma",
    prayer: "Namaz",
    arrive: "Lütfen namaz vaktinden önce erken gelin.",
    view: "Cuma ayrıntılarını görüntüle",
  },
} as const;

function serviceLabel(locale: Locale, index: number, total: number) {
  if (total === 1) return COPY[locale].title;
  if (locale === "ar") {
    const labels = ["الجمعة الأولى", "الجمعة الثانية", "الجمعة الثالثة"];
    return labels[index] || `الجمعة ${index + 1}`;
  }
  if (locale === "de") return `Freitagsgebet ${index + 1}`;
  if (locale === "tr") return `Cuma ${index + 1}`;
  return `Jumu'ah ${index + 1}`;
}

export function HomeJumuahCard({ schedule }: { schedule: HomeJumuahSchedule }) {
  const { locale } = useTranslation();
  const copy = COPY[locale];
  const status = schedule.daysUntil === 0
    ? copy.today
    : schedule.daysUntil === 1
      ? copy.tomorrow
      : schedule.daysUntil === 2
        ? copy.twoDays
        : copy.upcoming;
  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <Link
      href="/friday"
      className={`home-jumuah-card group relative block overflow-hidden rounded-[14px] border border-[var(--home-divider)] text-[#FCFAF6] ${direction === "rtl" ? "home-jumuah-card-rtl" : ""}`}
      data-testid="home-jumuah-card"
    >
      <span className="home-jumuah-image absolute inset-0" aria-hidden="true" />
      <span className="home-jumuah-overlay absolute inset-0" aria-hidden="true" />

      <div className="home-jumuah-content relative z-10" dir={direction}>
        <div className="home-jumuah-heading">
          <p className="home-jumuah-status inline-flex items-center gap-2 font-bold">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {status}
          </p>
          <h2 className="home-jumuah-title font-extrabold">{copy.title}</h2>
          <p className="home-jumuah-date font-semibold">{formatShortDate(schedule.date, locale)}</p>
        </div>

        <p className="home-jumuah-description font-semibold">
          {schedule.items.length > 1 ? copy.multiple : copy.single}
        </p>

        <div className="home-jumuah-times" role="list">
          {schedule.items.map((item, index) => (
            <div
              key={item.id}
              className="home-jumuah-time-row"
              data-next={index === schedule.nextIndex ? "true" : "false"}
              role="listitem"
            >
              <div className="home-jumuah-time-copy">
                <strong>{serviceLabel(locale, index, schedule.items.length)}</strong>
              </div>
              <div className="home-jumuah-prayer-time">
                <span>{copy.prayer}</span>
                <strong><FormattedTime time={item.prayerTime} /></strong>
              </div>
            </div>
          ))}
        </div>

        <div className="home-jumuah-footer">
          <span>{copy.arrive}</span>
          <span className="home-jumuah-view font-bold">{copy.view}</span>
        </div>
      </div>
    </Link>
  );
}
