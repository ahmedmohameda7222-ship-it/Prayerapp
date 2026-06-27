"use client";

import { useEffect, useMemo, useState } from "react";
import type { PrayerName, PrayerTime } from "@/lib/types";
import { formatLongDate } from "@/lib/date-utils";
import { formatCountdown, getNextPrayerFromSchedule } from "@/lib/prayer-utils";
import { useTranslation } from "@/lib/i18n/use-translation";

export function PrayerCountdown({ prayer, schedule }: { prayer: PrayerTime; schedule?: PrayerTime[] }) {
  const { t, locale } = useTranslation();
  const effectiveSchedule = useMemo(() => schedule || [prayer], [schedule, prayer]);
  const [state, setState] = useState<{
    name: PrayerName;
    time: string;
    countdown: string;
  }>({
    name: "asr",
    time: prayer.asr,
    countdown: "01:24:36",
  });

  useEffect(() => {
    const tick = () => {
      const next = getNextPrayerFromSchedule(effectiveSchedule, new Date());
      if (!next) return;
      setState({
        name: next.name,
        time: next.time,
        countdown: formatCountdown(next.target.getTime() - Date.now()),
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [effectiveSchedule]);

  return (
    <>
      <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--color-gold)]">{t("prayer.nextPrayer")}</p>
      <h2 className="font-brand text-5xl font-semibold leading-tight">{t(`prayer.${state.name}`)}</h2>
      <p className="font-brand text-[40px] font-semibold leading-tight">{state.countdown}</p>
      <p className="mt-2 text-sm font-bold text-white/86">{state.time} | {formatLongDate(getNextPrayerFromSchedule(effectiveSchedule)?.date || prayer.date, locale)}</p>
    </>
  );
}
