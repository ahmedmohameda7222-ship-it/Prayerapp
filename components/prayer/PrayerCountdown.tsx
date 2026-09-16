"use client";

import { useEffect, useMemo, useState } from "react";
import type { PrayerIqamaTimes, PrayerName, PrayerTime } from "@/lib/types";
import { formatCountdown, getNextPrayerFromSchedule } from "@/lib/prayer-utils";
import { getPrayerDisplayNameKey } from "@/lib/prayer-display-name";
import { useTranslation } from "@/lib/i18n/use-translation";

type CountdownState = {
  name: PrayerName;
  time: string;
  countdown: string;
  date: string;
  iqama?: string;
};

function stateFor(
  schedule: PrayerTime[],
  iqamaByDate: Record<string, PrayerIqamaTimes>,
  now: Date,
): CountdownState | null {
  const next = getNextPrayerFromSchedule(schedule, now);
  if (!next) return null;
  const iqama = iqamaByDate[next.date]?.[next.name];
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
  iqamaByDate,
  initialNow,
  variant = "default",
}: {
  prayer: PrayerTime;
  schedule?: PrayerTime[];
  iqamaByDate: Record<string, PrayerIqamaTimes>;
  initialNow: string;
  variant?: "default" | "instrument";
}) {
  const { t } = useTranslation();
  const effectiveSchedule = useMemo(() => schedule || [prayer], [schedule, prayer]);
  const [state, setState] = useState<CountdownState | null>(() => stateFor(effectiveSchedule, iqamaByDate, new Date(initialNow)));

  useEffect(() => {
    const tick = () => setState(stateFor(effectiveSchedule, iqamaByDate, new Date()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [effectiveSchedule, iqamaByDate]);

  if (!state) return null;
  const prayerName = t(getPrayerDisplayNameKey(state.name, state.date));

  if (variant === "instrument") {
    return (
      <div className="home-next-prayer-instrument text-[var(--home-text)]">
        <p className="home-next-prayer-label font-extrabold text-[var(--home-text)]">{t("prayer.nextPrayer")}</p>
        <h2 className="home-next-prayer-name mt-1 font-bold leading-tight text-[var(--home-brand-strong)]">{prayerName}</h2>
        <p className="home-next-prayer-adhan home-tabular mt-4 font-bold leading-none text-[var(--home-text)]" data-testid="next-prayer-adhan"><span dir="ltr">{state.time}</span></p>
        <p className="home-next-prayer-countdown home-tabular mt-2 font-bold leading-tight text-[var(--home-brand)]" aria-live="polite" data-testid="next-prayer-countdown"><span dir="ltr">{state.countdown}</span></p>
        {state.iqama ? <p className="home-next-prayer-iqama home-tabular mt-3 font-bold text-[var(--home-text-secondary)]">{t("prayer.iqama")} <span dir="ltr">{state.iqama}</span></p> : null}
      </div>
    );
  }

  return (
    <>
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-gold)] sm:text-xs">{t("prayer.nextPrayer")}</p>
      <h2 className="font-brand text-[34px] font-semibold leading-none sm:text-4xl lg:text-[42px]">{prayerName}</h2>
      <p className="mt-2 text-lg font-extrabold text-white">{state.time}</p>
      <p className="font-brand text-[30px] font-semibold leading-tight sm:text-4xl" aria-live="polite">{state.countdown}</p>
      {state.iqama ? <p className="mt-1 text-xs font-bold text-[var(--color-gold-soft)] sm:text-sm">{t("prayer.iqama")} {state.iqama}</p> : null}
    </>
  );
}
