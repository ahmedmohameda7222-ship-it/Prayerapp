import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "./feed-types";
import { isFridayIso, localDateIso, zonedDateTime } from "./time";

const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const LABELS: Record<DisplayPrayerName, { ar: string; de: string }> = {
  fajr: { ar: "الفجر", de: "Fajr" },
  dhuhr: { ar: "الظهر", de: "Dhuhr" },
  asr: { ar: "العصر", de: "Asr" },
  maghrib: { ar: "المغرب", de: "Maghrib" },
  isha: { ar: "العشاء", de: "Isha" },
};

const MINUTE_MS = 60_000;

function clockTime(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/** Iqama is an elapsed interval after the actual Adhan instant, not a local-clock addition. */
export function formatIqamaTime(
  date: string,
  adhanTime: string,
  delayMinutes: number,
  timezone: string,
): string {
  const adhan = zonedDateTime(date, adhanTime, timezone);
  return clockTime(new Date(adhan.getTime() + delayMinutes * MINUTE_MS), timezone);
}

export interface UpcomingPrayer {
  date: string;
  prayer: DisplayPrayerName;
  serviceNumber: number | null;
  labelAr: string;
  labelDe: string;
  adhanTime: string;
  iqamaTime: string | null;
}

type Candidate = UpcomingPrayer & { instantMs: number };

/**
 * The next prayer/service is selected from the canonical timetable, including
 * tomorrow and manually configured Friday services. Sunrise has no prayer state.
 * Friday Jumuah (primary and additional) has NO fabricated Iqama time.
 */
export function getUpcomingPrayer(
  feed: MasjidDisplayFeedV1,
  now: Date,
): UpcomingPrayer | null {
  const currentDate = localDateIso(now, feed.timezone);
  const nowMs = now.getTime();
  const candidates: Candidate[] = [];

  // The Feed horizon includes previous/today/future dates. Two calendar days
  // are enough for today and tomorrow, even after today's Isha.
  const upcomingDays = feed.prayers.schedule
    .filter((day) => day.date >= currentDate)
    .slice(0, 2);

  for (const day of upcomingDays) {
    const friday = isFridayIso(day.date);
    for (const prayer of PRAYERS) {
      const adhanTime = day[prayer];
      const instantMs = zonedDateTime(day.date, adhanTime, feed.timezone).getTime();
      if (instantMs <= nowMs) continue;

      const jumuah = friday && prayer === "dhuhr";
      candidates.push({
        date: day.date,
        prayer,
        serviceNumber: jumuah ? 1 : null,
        labelAr: jumuah ? "الجمعة الأولى" : LABELS[prayer].ar,
        labelDe: jumuah ? "Jumuah 1" : LABELS[prayer].de,
        adhanTime,
        iqamaTime: jumuah ? null : formatIqamaTime(
          day.date, adhanTime, feed.prayers.iqamaDelays[prayer], feed.timezone,
        ),
        instantMs,
      });
    }

    if (!friday) continue;

    // Same sort/dedup semantics as friday-state.ts: one primary Dhuhr
    // plus additional services strictly after Dhuhr, unique by local time.
    const services = feed.prayers.additionalJumuah
      .filter((service) => service.date === day.date && service.prayerTime > day.dhuhr)
      .sort((a, b) => a.prayerTime.localeCompare(b.prayerTime) || a.id.localeCompare(b.id));
    const seen = new Set<string>();
    let serviceNumber = 1;
    for (const service of services) {
      if (seen.has(service.prayerTime)) continue;
      seen.add(service.prayerTime);
      serviceNumber += 1;
      const instantMs = zonedDateTime(day.date, service.prayerTime, feed.timezone).getTime();
      if (instantMs <= nowMs) continue;
      candidates.push({
        date: day.date,
        prayer: "dhuhr",
        serviceNumber,
        labelAr: `الجمعة ${serviceNumber}`,
        labelDe: `Jumuah ${serviceNumber}`,
        adhanTime: service.prayerTime,
        iqamaTime: null,
        instantMs,
      });
    }
  }

  const next = candidates.sort((a,b) =>
    a.instantMs - b.instantMs || (a.serviceNumber ?? 0) - (b.serviceNumber ?? 0)
  )[0];
  if (!next) return null;

  return {
    date: next.date,
    prayer: next.prayer,
    serviceNumber: next.serviceNumber,
    labelAr: next.labelAr,
    labelDe: next.labelDe,
    adhanTime: next.adhanTime,
    iqamaTime: next.iqamaTime,
  };
}
