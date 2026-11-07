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

function iqamaTime(adhan: string, delayMinutes: number): string {
  const [hours, minutes] = adhan.split(":").map(Number);
  const minutesInDay = 24 * 60;
  const total = ((hours * 60 + minutes + delayMinutes) % minutesInDay + minutesInDay) % minutesInDay;
  const hour = String(Math.floor(total / 60)).padStart(2, "0");
  const minute = String(total % 60).padStart(2, "0");
  return hour + ":" + minute;
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
          data-highlighted={vm.state?.prayer === cell.key ? "true" : undefined}
          key={cell.key}
        >
          <div
            className="prayer-cell-content"
            data-testid={`prayer-${cell.key}`}
            data-informational={cell.informational ? "true" : undefined}
          >
            <div className="prayer-labels">
              <strong>{cell.labelDe}</strong>
              <span lang="ar" dir="rtl">{cell.labelAr}</span>
            </div>
            <div className="prayer-times">
              <div className="prayer-adhan">
                <span>{cell.informational ? "Zeit" : "Adhan"}</span>
                <time className="prayer-time">{cell.time}</time>
              </div>
              {cell.iqamaDelay === undefined ? null : (
                <div
                  className="prayer-iqama"
                  data-testid={`prayer-iqama-${cell.key}`}
                >
                  <span>Iqama</span>
                  <time>{iqamaTime(cell.time, cell.iqamaDelay)}</time>
                  <small>+{cell.iqamaDelay} min</small>
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
