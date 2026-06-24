import type { PrayerName, PrayerTime } from "@/lib/types";
import { formatLongDate } from "@/lib/date-utils";
import { prayerOrder } from "@/lib/prayer-utils";
import { Card } from "@/components/ui/Card";
import { PrayerRow } from "./PrayerRow";

export function PrayerTimesCard({ prayer, activePrayer = "asr" }: { prayer?: PrayerTime; activePrayer?: PrayerName }) {
  if (!prayer) {
    return <Card><p className="text-sm text-[var(--color-muted)]">Prayer times for this date have not been published yet.</p></Card>;
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]">Today&apos;s Prayer Times</h2>
        <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-bold text-[var(--color-muted)]">{formatLongDate(prayer.date)}</span>
      </div>
      <div className="grid gap-1">
        {prayerOrder.map((name) => (
          <PrayerRow key={name} prayer={prayer} name={name} active={name === activePrayer} />
        ))}
      </div>
    </Card>
  );
}
