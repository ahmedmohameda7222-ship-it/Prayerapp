"use client";

import { useEffect, useMemo, useState } from "react";
import { FormattedTime } from "@/components/ui/FormattedTime";
import { formatLongDate } from "@/lib/date-utils";
import { getUpcomingFridaySchedule } from "@/lib/friday";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { JumuahTime } from "@/lib/types";

const COPY = {
  ar: {
    title: "صلاة الجمعة",
    schedule: "مواعيد الجمعة القادمة",
    today: "الجمعة اليوم",
    khutbah: "الخطبة",
    prayer: "الصلاة",
    location: "الموقع",
    address: "العنوان",
    khateeb: "الخطيب",
    language: "اللغة",
    note: "ملاحظة مهمة",
    empty: "لم يتم نشر موعد صلاة الجمعة القادمة بعد.",
  },
  en: {
    title: "Jumu'ah Prayer",
    schedule: "Upcoming Friday schedule",
    today: "Jumu'ah today",
    khutbah: "Khutbah",
    prayer: "Prayer",
    location: "Location",
    address: "Address",
    khateeb: "Khateeb",
    language: "Language",
    note: "Important note",
    empty: "The next Friday prayer schedule has not been published yet.",
  },
  de: {
    title: "Freitagsgebet",
    schedule: "Nächster Freitagsplan",
    today: "Freitagsgebet heute",
    khutbah: "Khutba",
    prayer: "Gebet",
    location: "Ort",
    address: "Adresse",
    khateeb: "Khateeb",
    language: "Sprache",
    note: "Wichtiger Hinweis",
    empty: "Der nächste Freitagsgebetsplan wurde noch nicht veröffentlicht.",
  },
  tr: {
    title: "Cuma Namazı",
    schedule: "Yaklaşan cuma programı",
    today: "Cuma bugün",
    khutbah: "Hutbe",
    prayer: "Namaz",
    location: "Konum",
    address: "Adres",
    khateeb: "Hatip",
    language: "Dil",
    note: "Önemli not",
    empty: "Bir sonraki cuma namazı programı henüz yayımlanmadı.",
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

function clean(value: string | undefined) {
  return value?.trim() || "";
}

type FridayPageClientProps = {
  jumuahTimes: JumuahTime[];
  initialNow: string;
  loadFailed?: boolean;
};

export function FridayPageClient({ jumuahTimes, initialNow, loadFailed = false }: FridayPageClientProps) {
  const { t, locale } = useTranslation();
  const [now, setNow] = useState(() => new Date(initialNow));
  const schedule = useMemo(() => getUpcomingFridaySchedule(jumuahTimes, now), [jumuahTimes, now]);
  const copy = COPY[locale];
  const direction = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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

  return (
    <div className="friday-page" dir={direction} data-testid="friday-page">
      <section className="friday-identity" aria-labelledby="friday-page-title">
        <span className="friday-identity-image" aria-hidden="true" />
        <span className="friday-identity-scrim" aria-hidden="true" />
        <div className="friday-identity-content">
          <h1 id="friday-page-title">{copy.title}</h1>
          {schedule ? (
            <time dateTime={schedule.date}>{formatLongDate(schedule.date, locale)}</time>
          ) : null}
        </div>
      </section>

      <section className="friday-schedule" aria-labelledby="friday-schedule-title" data-testid="friday-schedule">
        <header className="friday-schedule-header">
          <div>
            <h2 id="friday-schedule-title">{copy.schedule}</h2>
            {schedule ? (
              <time dateTime={schedule.date}>{formatLongDate(schedule.date, locale)}</time>
            ) : null}
          </div>
          {schedule?.isToday ? <strong className="friday-today-status">{copy.today}</strong> : null}
        </header>

        {loadFailed ? (
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
                const showOwnLocation = !hasSharedLocation && Boolean(clean(item.locationName) || clean(item.locationAddress));
                const showOwnNote = Boolean(note) && note !== sharedNote;
                const isNext = schedule.isToday && index === schedule.nextIndex;

                return (
                  <article
                    key={item.id}
                    className="friday-service-row"
                    data-next={isNext ? "true" : "false"}
                    role="listitem"
                  >
                    <div className="friday-service-main">
                      <h3>{serviceLabel(locale, index, schedule.items.length)}</h3>
                      <dl className="friday-service-times">
                        <div>
                          <dt>{copy.khutbah}</dt>
                          <dd><FormattedTime time={item.khutbahTime} /></dd>
                        </div>
                        <div>
                          <dt>{copy.prayer}</dt>
                          <dd><FormattedTime time={item.prayerTime} /></dd>
                        </div>
                      </dl>
                    </div>

                    {(showOwnLocation || item.khateebName || language) ? (
                      <dl className="friday-service-meta">
                        {showOwnLocation && clean(item.locationName) ? (
                          <div>
                            <dt>{copy.location}</dt>
                            <dd>{clean(item.locationName)}</dd>
                          </div>
                        ) : null}
                        {showOwnLocation && clean(item.locationAddress) ? (
                          <div>
                            <dt>{copy.address}</dt>
                            <dd>{clean(item.locationAddress)}</dd>
                          </div>
                        ) : null}
                        {item.khateebName ? (
                          <div>
                            <dt>{copy.khateeb}</dt>
                            <dd>{item.khateebName}</dd>
                          </div>
                        ) : null}
                        {language ? (
                          <div>
                            <dt>{copy.language}</dt>
                            <dd>{language}</dd>
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
                      <dd>{sharedLocationAddress}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
          </>
        )}
      </section>

      {sharedNote ? (
        <aside className="friday-important-note" aria-label={copy.note} data-testid="friday-note">
          <strong>{copy.note}</strong>
          <p>{sharedNote}</p>
        </aside>
      ) : null}
    </div>
  );
}
