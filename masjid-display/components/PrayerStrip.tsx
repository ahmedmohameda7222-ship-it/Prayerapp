import type { DisplayPrayerDay, DisplayPrayerName } from "../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";
import { isFridayIso, localDateIso } from "../lib/time";

interface PrayerCell {
  key: "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
  labelDe: string;
  labelAr: string;
  time: string;
  informational?: boolean;
  iqamaDelay?: number;
}

function cellsForDay(
  day: DisplayPrayerDay,
  iqamaDelays: Record<DisplayPrayerName, number>,
  friday: boolean,
): PrayerCell[] {
  return [
    { key: "fajr", labelDe: "Fajr", labelAr: "الفجر", time: day.fajr, iqamaDelay: iqamaDelays.fajr },
    { key: "sunrise", labelDe: "Sonnenaufgang", labelAr: "الشروق", time: day.sunrise, informational: true },
    {
      key: "dhuhr",
      labelDe: friday ? "Jumuah" : "Dhuhr",
      labelAr: friday ? "الجمعة" : "الظهر",
      time: day.dhuhr,
      iqamaDelay: friday ? undefined : iqamaDelays.dhuhr,
    },
    { key: "asr", labelDe: "Asr", labelAr: "العصر", time: day.asr, iqamaDelay: iqamaDelays.asr },
    { key: "maghrib", labelDe: "Maghrib", labelAr: "المغرب", time: day.maghrib, iqamaDelay: iqamaDelays.maghrib },
    { key: "isha", labelDe: "Isha", labelAr: "العشاء", time: day.isha, iqamaDelay: iqamaDelays.isha },
  ];
}

export function PrayerStrip({ vm }: { vm: DisplayRuntimeViewModel }) {
  if (!vm.feed) return null;

  const localDate = localDateIso(vm.logicalNow, vm.feed.timezone);
  const day = vm.feed.prayers.schedule.find((entry) => entry.date === localDate);
  if (!day) return null;

  const cells = cellsForDay(day, vm.feed.prayers.iqamaDelays, isFridayIso(localDate));

  return (
    <section className="prayer-strip" aria-label="Gebetszeiten / مواقيت الصلاة">
      {cells.map((cell) => (
        <article
          className="prayer-cell"
          data-testid={`prayer-cell-${cell.key}`}
          data-informational={cell.informational ? "true" : undefined}
          key={cell.key}
          id={`prayer-${cell.key}`}
        >
          <div className="prayer-labels">
            <strong>{cell.labelDe}</strong>
            <span dir="rtl">{cell.labelAr}</span>
          </div>
          <time>{cell.time}</time>
          {cell.iqamaDelay === undefined ? null : (
            <small>Iqama +{cell.iqamaDelay} min</small>
          )}
        </article>
      ))}
    </section>
  );
}
