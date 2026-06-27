"use client";

import { Fragment } from "react";
import type { PrayerName, PrayerTime } from "@/lib/types";
import { formatLongDate } from "@/lib/date-utils";
import { prayerOrder } from "@/lib/prayer-utils";
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

export function PrayerTimesCard({ prayer, activePrayer }: { prayer?: PrayerTime; activePrayer?: PrayerName }) {
  const { t, locale } = useTranslation();
  if (!prayer) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-muted)]">{t("prayer.notPublished")}</p>
      </Card>
    );
  }

  const salatFajr = prayer.fajrIqama;
  const maghribProgram = prayer.maghribProgram;
  const salatMaghrib = maghribProgram?.maghribIqamaTime;
  const lessonDetail = [
    maghribProgram?.lessonTitle,
    maghribProgram?.lessonDurationMinutes
      ? `${maghribProgram.lessonDurationMinutes} ${t("prayer.minutes")}`
      : undefined,
  ].filter(Boolean).join(" · ");
  const hasMaghribProgram = Boolean(
    maghribProgram?.enabled
    && (salatMaghrib || lessonDetail || maghribProgram.combinedIshaTime),
  );

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]">{t("prayer.todaysPrayerTimes")}</h2>
        <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-bold text-[var(--color-muted)]">{formatLongDate(prayer.date, locale)}</span>
      </div>
      <div className="grid gap-1">
        {prayerOrder.map((name) => (
          <Fragment key={name}>
            <PrayerRow
              prayer={prayer}
              name={name}
              active={name === activePrayer}
              showIqama={name !== "fajr" && name !== "maghrib"}
            />
            {name === "fajr" && salatFajr ? <SupplementalPrayerRow label={t("prayer.salatFajr")} time={salatFajr} /> : null}
            {name === "maghrib" && hasMaghribProgram ? (
              <div className="grid gap-1 border-s-2 border-[var(--color-gold)] ps-2">
                {salatMaghrib ? <SupplementalPrayerRow label={t("prayer.salatMaghrib")} time={salatMaghrib} /> : null}
                {lessonDetail ? <SupplementalPrayerRow label={t("prayer.khatira")} detail={lessonDetail} /> : null}
                {maghribProgram?.combinedIshaTime ? <SupplementalPrayerRow label={t("prayer.salatIsha")} time={maghribProgram.combinedIshaTime} /> : null}
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>
    </Card>
  );
}
