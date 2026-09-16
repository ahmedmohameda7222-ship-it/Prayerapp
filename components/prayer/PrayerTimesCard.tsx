"use client";

import { Fragment } from "react";
import type { PrayerIqamaTimes, PrayerName, PrayerTime } from "@/lib/types";
import { formatLongDate } from "@/lib/date-utils";
import { prayerOrder } from "@/lib/prayer-utils";
import { isFridayIso } from "@/lib/friday";
import { Card } from "@/components/ui/Card";
import { FormattedTime } from "@/components/ui/FormattedTime";
import { PrayerRow } from "./PrayerRow";
import { useTranslation } from "@/lib/i18n/use-translation";

function SupplementalPrayerRow({ label, time, detail }: { label: string; time?: string; detail?: string }) {
  return (
    <div className="ms-[54px] grid min-h-10 grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-[var(--color-cream)] px-3 py-2">
      <p className="text-sm font-bold text-[var(--color-charcoal)]">{label}</p>
      <p className="font-extrabold text-[var(--color-emerald)]">{time ? <FormattedTime time={time} /> : detail || "—"}</p>
    </div>
  );
}

export function PrayerTimesCard({
  prayer,
  activePrayer,
  iqamaTimes = {},
}: {
  prayer?: PrayerTime;
  activePrayer?: PrayerName;
  iqamaTimes?: PrayerIqamaTimes;
}) {
  const { t, locale } = useTranslation();
  const salatIshaLabel = locale === "de" ? "Ischa-Gebet (Programm)" : t("prayer.salatIsha");

  if (!prayer) {
    return <Card><p className="text-sm text-[var(--color-muted)]">{t("prayer.notPublished")}</p></Card>;
  }

  const maghribProgram = prayer.maghribProgram;
  const lessonDetail = [
    maghribProgram?.lessonTitle,
    maghribProgram?.lessonDurationMinutes
      ? `${maghribProgram.lessonDurationMinutes} ${t("prayer.minutes")}`
      : undefined,
  ].filter(Boolean).join(" · ");
  const hasMaghribProgram = Boolean(
    maghribProgram?.enabled && (lessonDetail || maghribProgram.combinedIshaTime),
  );

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]">{t("prayer.todaysPrayerTimes")}</h2>
        <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-bold text-[var(--color-muted)]">{formatLongDate(prayer.date, locale)}</span>
      </div>
      <div className="grid gap-1">
        {prayerOrder.map((name) => {
          const showIqama = name !== "sunrise" && !(name === "dhuhr" && isFridayIso(prayer.date));
          const iqama = name === "sunrise" ? undefined : iqamaTimes[name];
          return (
            <Fragment key={name}>
              <PrayerRow
                prayer={prayer}
                name={name}
                active={name === activePrayer}
                iqama={iqama}
                showIqama={showIqama}
              />
              {name === "maghrib" && hasMaghribProgram ? (
                <div className="grid gap-1 border-s-2 border-[var(--color-gold)] ps-2">
                  {lessonDetail ? <SupplementalPrayerRow label={t("prayer.khatira")} detail={lessonDetail} /> : null}
                  {maghribProgram?.combinedIshaTime ? <SupplementalPrayerRow label={salatIshaLabel} time={maghribProgram.combinedIshaTime} /> : null}
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </Card>
  );
}
