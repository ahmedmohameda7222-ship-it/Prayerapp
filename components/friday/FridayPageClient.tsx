"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FormattedTime } from "@/components/ui/FormattedTime";
import { formatLongDate } from "@/lib/date-utils";
import { getUpcomingFridaySchedule } from "@/lib/friday";
import { getFridayPresentation } from "@/lib/friday-presentation";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { JumuahTime } from "@/lib/types";
import fridayImage from "@/public/assets/home-jumuah-background.webp";

function serviceLabel(locale: Locale, index: number, total: number, singleLabel: string) {
  if (total === 1) return singleLabel;

  if (locale === "ar") {
    const labels = ["الجمعة الأولى", "الجمعة الثانية", "الجمعة الثالثة"];
    return labels[index] || `الجمعة ${index + 1}`;
  }
  if (locale === "de") return `${index + 1}. Freitagsgebet`;
  if (locale === "tr") return `${index + 1}. Cuma`;

  const labels = ["First Jumu'ah", "Second Jumu'ah", "Third Jumu'ah"];
  return labels[index] || `Jumu'ah ${index + 1}`;
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
  const presentation = useMemo(
    () => getFridayPresentation(schedule?.items || [], locale),
    [locale, schedule],
  );
  const direction = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="friday-page" dir={direction} data-testid="friday-page">
      <div className="friday-identity" aria-hidden="true">
        <Image
          src={fridayImage}
          alt=""
          fill
          sizes="(max-width: 1023px) 100vw, 1080px"
          className="friday-identity-image"
        />
        <span className="friday-identity-scrim" />
      </div>

      <section className="friday-schedule" aria-labelledby="friday-schedule-title" data-testid="friday-schedule">
        <header className="friday-schedule-header">
          <div>
            <h2 id="friday-schedule-title">{t("friday.jumuahPrayer")}</h2>
            {schedule ? (
              <time dateTime={schedule.date}>{formatLongDate(schedule.date, locale)}</time>
            ) : null}
          </div>
          {schedule?.isToday ? <strong className="friday-today-status">{t("times.today")}</strong> : null}
        </header>

        {loadFailed ? (
          <div className="friday-empty-state" data-state="error" role="alert">
            <p>{t("common.dataLoadFailed")}</p>
          </div>
        ) : !schedule ? (
          <div className="friday-empty-state" data-state="empty" role="status">
            <p>{t("friday.empty")}</p>
          </div>
        ) : (
          <>
            <ol className="friday-service-list">
              {presentation.items.map((entry, index) => {
                const { item, language, note, locationName, locationAddress, showOwnLocation, showOwnNote } = entry;
                const isNext = schedule.isToday && index === schedule.nextIndex;

                return (
                  <li
                    key={item.id}
                    className="friday-service-row"
                    data-next={isNext ? "true" : "false"}
                  >
                    <article>
                      <div className="friday-service-heading">
                        <h3>{serviceLabel(locale, index, schedule.items.length, t("friday.jumuahPrayer"))}</h3>
                        {isNext ? <span className="friday-next-label">{t("times.nextRange")}</span> : null}
                      </div>

                      <dl className="friday-service-times">
                        <div className="friday-time-primary">
                          <dt>{t("prayer.prayer")}</dt>
                          <dd><FormattedTime time={item.prayerTime} /></dd>
                        </div>
                        <div className="friday-time-secondary">
                          <dt>{t("prayer.khutbah")}</dt>
                          <dd><FormattedTime time={item.khutbahTime} /></dd>
                        </div>
                      </dl>

                      {(item.khateebName || language) ? (
                        <dl className="friday-service-meta">
                          {item.khateebName ? (
                            <div>
                              <dt>{t("friday.khateeb")}</dt>
                              <dd dir="auto">{item.khateebName}</dd>
                            </div>
                          ) : null}
                          {language ? (
                            <div>
                              <dt>{t("friday.language")}</dt>
                              <dd dir="auto">{language}</dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}

                      {showOwnLocation ? (
                        <div className="friday-location-row friday-service-location">
                          <span className="friday-location-label">{t("friday.location")}</span>
                          <div className="friday-location-value" dir="auto">
                            {locationName ? <strong>{locationName}</strong> : null}
                            {locationAddress ? <span>{locationAddress}</span> : null}
                          </div>
                        </div>
                      ) : null}

                      {showOwnNote ? (
                        <aside className="friday-service-note">
                          <p>{note}</p>
                        </aside>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ol>

            {presentation.sharedLocation ? (
              <div className="friday-location-row friday-shared-location" data-testid="friday-shared-location">
                <span className="friday-location-label">{t("friday.location")}</span>
                <div className="friday-location-value" dir="auto">
                  {presentation.sharedLocation.name ? <strong>{presentation.sharedLocation.name}</strong> : null}
                  {presentation.sharedLocation.address ? <span>{presentation.sharedLocation.address}</span> : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {presentation.sharedNote ? (
        <aside className="friday-important-note" data-testid="friday-note">
          <p>{presentation.sharedNote}</p>
        </aside>
      ) : null}
    </div>
  );
}
