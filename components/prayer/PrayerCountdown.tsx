"use client";

import { useEffect, useMemo, useState } from "react";
import type { PrayerName, PrayerTime } from "@/lib/types";
import { formatCountdown, getIqama, getNextPrayerFromSchedule } from "@/lib/prayer-utils";
import { useTranslation } from "@/lib/i18n/use-translation";

type CountdownState = {
  name: PrayerName;
  time: string;
  countdown: string;
  date: string;
  iqama?: string;
};

function stateFor(schedule: PrayerTime[], now: Date): CountdownState | null {
  const next = getNextPrayerFromSchedule(schedule, now);
  if (!next) return null;
  const day = schedule.find((item) => item.date === next.date);
  let iqama = day ? getIqama(day, next.name) : undefined;
  if (day && next.name === "maghrib") iqama = day.maghribProgram?.maghribIqamaTime || iqama;
  if (day && next.name === "isha") iqama = day.maghribProgram?.combinedIshaTime || iqama;
  return {
    name: next.name,
    time: next.time,
    countdown: formatCountdown(next.target.getTime() - now.getTime()),
    date: next.date,
    iqama,
  };
}

export function PrayerCountdown({
  prayer,
  schedule,
  initialNow,
}: {
  prayer: PrayerTime;
  schedule?: PrayerTime[];
  initialNow: string;
}) {
  const { t } = useTranslation();
  const effectiveSchedule = useMemo(() => schedule || [prayer], [schedule, prayer]);
  const [state, setState] = useState<CountdownState | null>(() => stateFor(effectiveSchedule, new Date(initialNow)));

  useEffect(() => {
    const tick = () => setState(stateFor(effectiveSchedule, new Date()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [effectiveSchedule]);

  if (!state) return null;

  return (
    <>
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-gold)] sm:text-xs">{t("prayer.nextPrayer")}</p>
      <h2 className="font-brand text-[34px] font-semibold leading-none sm:text-4xl lg:text-[42px]">{t(`prayer.${state.name}`)}</h2>
      <p className="mt-2 text-lg font-extrabold text-white">{state.time}</p>
      <p className="font-brand text-[30px] font-semibold leading-tight sm:text-4xl" aria-live="polite">{state.countdown}</p>
      {state.iqama ? (
        <p className="mt-1 text-xs font-bold text-[var(--color-gold-soft)] sm:text-sm">{t("prayer.iqama")} {state.iqama}</p>
      ) : null}
    </>
  );
}
