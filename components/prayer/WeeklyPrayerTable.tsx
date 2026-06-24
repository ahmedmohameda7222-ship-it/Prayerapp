import type { PrayerName, PrayerTime } from "@/lib/types";
import { formatShortDate } from "@/lib/date-utils";
import { getIqama, prayerLabels, prayerOrder } from "@/lib/prayer-utils";

export function WeeklyPrayerTable({ times, selectedDate, activePrayer = "asr" }: { times: PrayerTime[]; selectedDate: string; activePrayer?: PrayerName }) {
  return (
    <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
          <tr>
            <th className="px-4 py-3">Day</th>
            {prayerOrder.map((name) => (
              <th key={name} className="px-3 py-3">{prayerLabels[name]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((day) => (
            <tr key={day.id} className={day.date === selectedDate ? "bg-[var(--color-emerald-soft)]" : "border-t border-[var(--color-border)]"}>
              <td className="whitespace-nowrap px-4 py-3 font-bold text-[var(--color-emerald)]">{formatShortDate(day.date)}</td>
              {prayerOrder.map((name) => (
                <td key={name} className={`px-3 py-3 ${day.date === selectedDate && name === activePrayer ? "text-[var(--color-emerald)]" : ""}`}>
                  <div className="font-extrabold">{day[name]}</div>
                  {getIqama(day, name) ? <div className="text-xs text-[var(--color-muted)]">Iqama {getIqama(day, name)}</div> : <div className="text-xs text-[var(--color-muted)]">-</div>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
