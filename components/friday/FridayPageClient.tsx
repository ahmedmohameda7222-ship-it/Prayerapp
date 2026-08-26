"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FormattedTime } from "@/components/ui/FormattedTime";
import { formatLongDate } from "@/lib/date-utils";
import { getFridayLivePrayer, resolveUpcomingFridaySchedule } from "@/lib/friday";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { FridayKhutbah, JumuahTime, PrayerTime } from "@/lib/types";

const COPY = {
  ar: {
    nextPrayer: "الصلاة القادمة",
    schedule: "مواعيد صلاة الجمعة",
    today: "الجمعة اليوم",
    prayer: "وقت الصلاة",
    remaining: "متبقي",
    imminent: "اقتربت الصلاة",
    location: "الموقع",
    address: "العنوان",
    language: "اللغة",
    note: "ملاحظة مهمة",
    primary: "الصلاة الرئيسية",
    readKhutbah: "قراءة الخطبة",
    empty: "لم يتم نشر موعد صلاة الجمعة القادمة بعد.",
  },
  en: {
    nextPrayer: "Next Jumu'ah prayer",
    schedule: "Friday prayer schedule",
    today: "Jumu'ah today",
    prayer: "Prayer time",
    remaining: "Time remaining",
    imminent: "Prayer soon",
    location: "Location",
    address: "Address",
    language: "Language",
    note: "Important note",
    primary: "Primary prayer",
    readKhutbah: "Read Khutbah",
    empty: "The next Friday prayer schedule has not been published yet.",
  },
  de: {
    nextPrayer: "Nächstes Freitagsgebet",
    schedule: "Freitagsgebete",
    today: "Freitagsgebet heute",
    prayer: "Gebetszeit",
    remaining: "Verbleibende Zeit",
    imminent: "Gebet beginnt bald",
    location: "Ort",
    address: "Adresse",
    language: "Sprache",
    note: "Wichtiger Hinweis",
    primary: "Hauptgebet",
    readKhutbah: "Predigt lesen",
    empty: "Der nächste Freitagsgebetsplan wurde noch nicht veröffentlicht.",
  },
  tr: {
    nextPrayer: "Sıradaki cuma namazı",
    schedule: "Cuma namazı programı",
    today: "Cuma bugün",
    prayer: "Namaz vakti",
    remaining: "Kalan süre",
    imminent: "Namaz yaklaşıyor",
    location: "Konum",
    address: "Adres",
    language: "Dil",
    note: "Önemli not",
    primary: "Ana namaz",
    readKhutbah: "Hutbeyi oku",
    empty: "Bir sonraki cuma namazı programı henüz yayımlanmadı.",
  },
} as const;

function serviceLabel(locale: Locale, index: number) {
  if (locale === "ar") {
    const labels = ["الجمعة الأولى", "الجمعة الثانية", "الجمعة الثالثة"];
    return labels[index] || `الجمعة ${index + 1}`;
  }
  if (locale === "de") return `Freitagsgebet ${index + 1}`;
  if (locale === "tr") return `Cuma ${index + 1}`;
  return `Jumu'ah ${index + 1}`;
}

function clean(value: string | undefined) {
  return value?.trim() || "";
}

function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function formatDays(days: number, locale: Locale) {
  if (locale === "ar") {
    if (days === 1) return "يوم واحد";
    if (days === 2) return "يومان";
    if (days >= 3 && days <= 10) return `${days} أيام`;
    return `${days} يومًا`;
  }
  if (locale === "de") return days === 1 ? "1 Tag" : `${days} Tage`;
  if (locale === "tr") return `${days} gün`;
  return days === 1 ? "1 day" : `${days} days`;
}

function countdownParts(ms: number, locale: Locale) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = String(Math.floor((totalSeconds % 86_400) / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return {
    days: days > 0 ? formatDays(days, locale) : "",
    clock: `${hours}:${minutes}:${seconds}`,
  };
}

type FridayPageClientProps = {
  prayerTimes: PrayerTime[];
  jumuahTimes: JumuahTime[];
  fridayKhutbah?: FridayKhutbah;
  initialNow: string;
  initialScheduleDate: string;
  prayerTimesLoadFailed?: boolean;
  additionalTimesLoadFailed?: boolean;
  khutbahLoadFailed?: boolean;
};

export function FridayPageClient({
  prayerTimes,
  jumuahTimes,
  fridayKhutbah,
  initialNow,
  initialScheduleDate,
  prayerTimesLoadFailed = false,
  additionalTimesLoadFailed = false,
  khutbahLoadFailed = false,
}: FridayPageClientProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [now, setNow] = useState(() => new Date(initialNow));
  const schedule = useMemo(
    () => resolveUpcomingFridaySchedule(prayerTimes, jumuahTimes, now),
    [jumuahTimes, now, prayerTimes],
  );
  const livePrayer = useMemo(() => getFridayLivePrayer(schedule, now), [schedule, now]);
  const copy = COPY[locale];
  const direction = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (schedule?.date && initialScheduleDate && schedule.date !== initialScheduleDate) {
      router.refresh();
    }
  }, [initialScheduleDate, router, schedule?.date]);

  const localizedItems = schedule?.items.map((item) => ({
    item,
    language: getLocalizedField(item, "language", locale),
    note: getLocalizedField(item, "notes", locale),
  })) || [];

  const locationKeys = localizedItems.map(({ item }) => `${clean(item.locationName)}|${clean(item.locationAddress)}`);
  const firstLocationKey = locationKeys[0] || "";
  const hasSharedLocation = Boolean(firstLocationKey.replace("|", ""))
    && locationKeys.every((key) => key === firstLocationKey);
  const sharedLocationName = hasSharedLocation ? clean(localizedItems[0]?.item.locationName) : "";
  const sharedLocationAddress = hasSharedLocation ? clean(localizedItems[0]?.item.locationAddress) : "";

  const localizedNotes = localizedItems.map(({ note }) => note);
  const sharedNote = localizedNotes.length > 0
    && Boolean(localizedNotes[0])
    && localizedNotes.every((note) => note === localizedNotes[0])
    ? localizedNotes[0]
    : "";

  const countdown = livePrayer ? countdownParts(livePrayer.remainingMs, locale) : null;
  const showKhutbah = Boolean(
    schedule
    && fridayKhutbah?.published
    && fridayKhutbah.date === schedule.date,
  );

  return (
    <div
      className="friday-page"
      dir={direction}
      data-testid="friday-page"
      data-additional-times-load-failed={additionalTimesLoadFailed ? "true" : "false"}
      data-khutbah-load-failed={khutbahLoadFailed ? "true" : "false"}
    >
      <section
        className="friday-live-hero"
        data-imminent={livePrayer?.imminent ? "true" : "false"}
        aria-labelledby={livePrayer ? "friday-live-title" : undefined}
      >
        <span className="friday-live-image" aria-hidden="true" />
        <span className="friday-live-scrim" aria-hidden="true" />
        {livePrayer && schedule && countdown ? (
          <div className="friday-live-content">
            <div className="friday-live-copy">
              <p className="friday-live-eyebrow">{copy.nextPrayer}</p>
              <h2 id="friday-live-title">{serviceLabel(locale, livePrayer.index)}</h2>
              <div className="friday-live-primary">
                <p className="friday-live-time">
                  <bdi dir="ltr" className="inline-block [unicode-bidi:isolate]">
                    <FormattedTime time={livePrayer.item.prayerTime} />
                  </bdi>
                </p>
                <div className="friday-live-countdown-wrap">
                  <span>{livePrayer.imminent ? copy.imminent : copy.remaining}</span>
                  <p className="friday-live-countdown flex flex-wrap items-baseline gap-x-1.5" role="timer" aria-live="off">
                    {countdown.days ? (
                      <>
                        <span dir={direction} className="[unicode-bidi:isolate]">{countdown.days}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    ) : null}
                    <bdi dir="ltr" className="inline-block [unicode-bidi:isolate]">{countdown.clock}</bdi>
                  </p>
                </div>
              </div>
              <time className="friday-live-date" dateTime={schedule.date}>
                {formatLongDate(schedule.date, locale)}
              </time>
            </div>
          </div>
        ) : null}
      </section>

      <section className="friday-schedule" aria-labelledby="friday-schedule-title" data-testid="friday-schedule">
        <header className="friday-schedule-header">
          <div>
            <h2 id="friday-schedule-title">{copy.schedule}</h2>
            {schedule ? <time dateTime={schedule.date}>{formatLongDate(schedule.date, locale)}</time> : null}
          </div>
          {schedule?.isToday ? <strong className="friday-today-status">{copy.today}</strong> : null}
        </header>

        {prayerTimesLoadFailed ? (
          <div className="friday-empty-state" role="status">
            <p>{t("common.dataLoadFailed")}</p>
          </div>
        ) : !schedule ? (
          <div className="friday-empty-state" role="status">
            <p>{copy.empty}</p>
          </div>
        ) : (
          <>
            <div className="friday-service-list" role="list">
              {localizedItems.map(({ item, language, note }, index) => {
                const ownAddress = clean(item.locationAddress);
                const showOwnLocation = !hasSharedLocation && Boolean(clean(item.locationName) || ownAddress);
                const showOwnNote = Boolean(note) && note !== sharedNote;
                const isNext = index === schedule.nextIndex;
                const isPrimary = item.source === "prayer-times";

                return (
                  <article
                    key={item.id}
                    className="friday-service-row"
                    data-next={isNext ? "true" : "false"}
                    data-primary={isPrimary ? "true" : "false"}
                    role="listitem"
                  >
                    <div className="friday-service-main">
                      <div className="friday-service-heading">
                        <h3>{serviceLabel(locale, index)}</h3>
                        {isPrimary ? <span className="friday-next-label">{copy.primary}</span> : null}
                        {schedule.isToday && isNext ? <span className="friday-next-label">{copy.nextPrayer}</span> : null}
                      </div>
                      <dl className="friday-service-prayer">
                        <div>
                          <dt>{copy.prayer}</dt>
                          <dd>
                            <bdi dir="ltr" className="inline-block [unicode-bidi:isolate]">
                              <FormattedTime time={item.prayerTime} />
                            </bdi>
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {(showOwnLocation || language) ? (
                      <dl className="friday-service-meta">
                        {language ? (
                          <div>
                            <dt>{copy.language}</dt>
                            <dd>{language}</dd>
                          </div>
                        ) : null}
                        {showOwnLocation && clean(item.locationName) ? (
                          <div>
                            <dt>{copy.location}</dt>
                            <dd>{clean(item.locationName)}</dd>
                          </div>
                        ) : null}
                        {showOwnLocation && ownAddress ? (
                          <div>
                            <dt>{copy.address}</dt>
                            <dd>
                              <a href={mapsHref(ownAddress)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                                {ownAddress}
                              </a>
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : null}

                    {showOwnNote ? <p className="friday-service-note">{note}</p> : null}
                  </article>
                );
              })}
            </div>

            {hasSharedLocation ? (
              <div className="friday-shared-details">
                <dl>
                  {sharedLocationName ? (
                    <div>
                      <dt>{copy.location}</dt>
                      <dd>{sharedLocationName}</dd>
                    </div>
                  ) : null}
                  {sharedLocationAddress ? (
                    <div>
                      <dt>{copy.address}</dt>
                      <dd>
                        <a href={mapsHref(sharedLocationAddress)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          {sharedLocationAddress}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
          </>
        )}
      </section>

      {showKhutbah && schedule ? (
        <div className="px-4 sm:px-5">
          <Link
            href={`/friday/khutbah/${schedule.date}`}
            data-testid="friday-khutbah-cta"
            className="flex min-h-12 w-full items-center justify-center rounded-[14px] bg-[var(--ui-brand)] px-4 text-base font-bold text-white transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {copy.readKhutbah}
          </Link>
        </div>
      ) : null}

      {sharedNote ? (
        <aside className="friday-important-note" aria-label={copy.note} data-testid="friday-note">
          <strong>{copy.note}</strong>
          <p>{sharedNote}</p>
        </aside>
      ) : null}
    </div>
  );
}
