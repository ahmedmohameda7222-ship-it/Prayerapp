"use client";

import type { PrayerName, PrayerTime } from "@/lib/types";
import { formatShortDate } from "@/lib/date-utils";
import { getIqama, prayerOrder } from "@/lib/prayer-utils";
import { getPrayerDisplayNameKey } from "@/lib/prayer-display-name";
import { isFridayIso } from "@/lib/friday";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";
import { formatTime } from "@/lib/time-format";
import { useTranslation } from "@/lib/i18n/use-translation";

export function WeeklyPrayerTable({
  times,
  selectedDate,
  activePrayer = "asr",
}: {
  times: PrayerTime[];
  selectedDate: string;
  activePrayer?: PrayerName;
}) {
  const { timeFormat } = useTimeFormat();
  const { t, locale } = useTranslation();
  const includesFriday = times.some((day) => isFridayIso(day.date));
  const includesNonFriday = times.some((day) => !isFridayIso(day.date));

  function columnLabel(name: PrayerName) {
    if (name !== "dhuhr") return t(`prayer.${name}`);
    if (includesFriday && includesNonFriday) return `${t("prayer.dhuhr")} / ${t("prayer.jumuah")}`;
    return t(getPrayerDisplayNameKey(name, times[0]?.date || selectedDate));
  }

  return (
    <>
      <div className="mobile-prayer-days">
        {times.map((day) => (
          <article key={day.id} className="mobile-prayer-day" data-today={day.date === selectedDate ? "true" : undefined}>
            <header className="mobile-prayer-day-header">
              <time dateTime={day.date}>{formatShortDate(day.date, locale)}</time>
            </header>
            <div className="mobile-prayer-day-grid">
              {prayerOrder.map((name) => {
                const iqama = getIqama(day, name);
                const isActive = day.date === selectedDate && name === activePrayer;
                return (
                  <div key={name} className="mobile-prayer-cell" data-active={isActive ? "true" : undefined}>
                    <p className="mobile-prayer-cell-name">{t(getPrayerDisplayNameKey(name, day.date))}</p>
                    <p className="mobile-prayer-cell-time">{formatTime(day[name], timeFormat)}</p>
                    <p className="mobile-prayer-cell-iqama">
                      {iqama ? `${t("prayer.iqama")} ${formatTime(iqama, timeFormat)}` : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <div className="desktop-prayer-table overflow-x-auto rounded-[18px] border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
            <tr>
              <th className="px-4 py-3">{t("times.day")}</th>
              {prayerOrder.map((name) => (
                <th key={name} className="px-3 py-3">{columnLabel(name)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((day) => (
              <tr key={day.id} className={day.date === selectedDate ? "bg-[var(--color-emerald-soft)]" : "border-t border-[var(--color-border)]"}>
                <td className="whitespace-nowrap px-4 py-3 font-bold text-[var(--color-emerald)]">{formatShortDate(day.date, locale)}</td>
                {prayerOrder.map((name) => {
                  const iqama = getIqama(day, name);
                  return (
                    <td key={name} className={`px-3 py-3 ${day.date === selectedDate && name === activePrayer ? "text-[var(--color-emerald)]" : ""}`}>
                      <div className="sr-only">{t(getPrayerDisplayNameKey(name, day.date))}</div>
                      <div className="font-extrabold">{formatTime(day[name], timeFormat)}</div>
                      {iqama ? <div className="text-xs text-[var(--color-muted)]">{t("prayer.iqama")} {formatTime(iqama, timeFormat)}</div> : <div className="text-xs text-[var(--color-muted)]">—</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
