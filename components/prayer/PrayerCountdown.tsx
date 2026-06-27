"use client";

import { useEffect, useMemo, useState } from "react";
import type { PrayerName, PrayerTime } from "@/lib/types";
import { formatHijriDate, formatLongDate } from "@/lib/date-utils";
import { formatCountdown, getNextPrayerFromSchedule } from "@/lib/prayer-utils";
import { useTranslation } from "@/lib/i18n/use-translation";

export function PrayerCountdown({ prayer, schedule }: { prayer: PrayerTime; schedule?: PrayerTime[] }) {
  const { t, locale } = useTranslation();
  const effectiveSchedule = useMemo(() => schedule || [prayer], [schedule, prayer]);
  const [state, setState] = useState<{
    name: PrayerName;
    time: string;
    countdown: string;
    date: string;
  }>({
    name: "asr",
    time: prayer.asr,
    countdown: "01:24:36",
    date: prayer.date,
  });

  useEffect(() => {
    const tick = () => {
      const next = getNextPrayerFromSchedule(effectiveSchedule, new Date());
      if (!next) return;
      setState({
        name: next.name,
        time: next.time,
        countdown: formatCountdown(next.target.getTime() - Date.now()),
        date: next.date,
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [effectiveSchedule]);

  return (
    <>
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-gold)] sm:text-xs">{t("prayer.nextPrayer")}</p>
      <h2 className="font-brand text-[34px] font-semibold leading-none sm:text-4xl lg:text-[42px]">{t(`prayer.${state.name}`)}</h2>
      <p className="font-brand text-[30px] font-semibold leading-tight sm:text-4xl">{state.countdown}</p>
      <div className="mt-1.5 text-[11px] font-bold leading-4 text-white/86 sm:text-sm">
        <p>{state.time} | {formatLongDate(state.date, locale)}</p>
        <p className="text-[var(--color-gold-soft)]">{formatHijriDate(state.date, locale)}</p>
      </div>
    </>
  );
}
