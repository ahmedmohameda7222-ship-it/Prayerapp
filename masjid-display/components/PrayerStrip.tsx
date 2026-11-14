import type { DisplayPrayerDay, DisplayPrayerName } from "../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";
import { isFridayIso, localDateIso, zonedDateTime } from "../lib/time";

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

  const friday = isFridayIso(localDate);
  const cells = cellsForDay(day, vm.feed.prayers.iqamaDelays, friday);
  const nextPrayer = (["fajr", "dhuhr", "asr", "maghrib", "isha"] as const)
    .find((key) => zonedDateTime(localDate, day[key], vm.feed!.timezone).getTime() > vm.logicalNow.getTime()) ?? null;
  const nextPrayerMs = nextPrayer
    ? zonedDateTime(localDate, day[nextPrayer], vm.feed.timezone).getTime()
    : null;
  // An extra Admin-created Jumuah may precede Asr. Never identify Asr as
  // the next Friday service while such a service is still upcoming.
  const upcomingAdditionalJumuah = friday && nextPrayerMs !== null &&
    vm.feed.prayers.additionalJumuah.some((service) => {
      if (service.date !== localDate || service.prayerTime <= day.dhuhr) return false;
      const serviceMs = zonedDateTime(service.date, service.prayerTime, vm.feed!.timezone).getTime();
      return serviceMs > vm.logicalNow.getTime() && serviceMs < nextPrayerMs;
    });
  const highlightedPrayer = upcomingAdditionalJumuah ? null : nextPrayer;

  return (
    <section className="prayer-strip" aria-label="Gebetszeiten / مواقيت الصلاة">
      {cells.map((cell) => (
        <article
          className="prayer-cell"
          data-testid={`prayer-cell-${cell.key}`}
          key={cell.key}
          data-next={highlightedPrayer === cell.key ? "true" : undefined}
        >
          <div
            className="prayer-cell-content"
            data-testid={`prayer-${cell.key}`}
            data-informational={cell.informational ? "true" : undefined}
          >
            <div className="prayer-labels">
              <strong>{cell.labelDe}</strong>
              <span dir="rtl">{cell.labelAr}</span>
            </div>
            <time className="prayer-time">{cell.time}</time>
            {cell.iqamaDelay === undefined ? null : (
              <div
                className="prayer-iqama"
                data-testid={`prayer-iqama-${cell.key}`}
              >
                Iqama +{cell.iqamaDelay} min
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
