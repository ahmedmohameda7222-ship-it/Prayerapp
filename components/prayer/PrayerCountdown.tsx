"use client";

import { useEffect, useState } from "react";
import type { PrayerTime } from "@/lib/types";
import { formatLongDate } from "@/lib/date-utils";
import { formatCountdown, getNextPrayer, prayerLabels } from "@/lib/prayer-utils";

export function PrayerCountdown({ prayer }: { prayer: PrayerTime }) {
  const [state, setState] = useState({
    name: "asr",
    time: prayer.asr,
    countdown: "01:24:36",
  });

  useEffect(() => {
    const tick = () => {
      const next = getNextPrayer(prayer, new Date());
      setState({
        name: next.name,
        time: next.time,
        countdown: formatCountdown(next.target.getTime() - Date.now()),
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [prayer]);

  return (
    <>
      <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--color-gold)]">Next Prayer</p>
      <h2 className="font-brand text-5xl font-semibold leading-tight">{prayerLabels[state.name as keyof typeof prayerLabels]}</h2>
      <p className="font-brand text-[40px] font-semibold leading-tight">{state.countdown}</p>
      <p className="mt-2 text-sm font-bold text-white/86">{state.time} · {formatLongDate(prayer.date)}</p>
    </>
  );
}
