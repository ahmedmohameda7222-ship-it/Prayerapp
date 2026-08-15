import { addDaysIso, todayIso } from "@/lib/date-utils";
import type { Locale } from "@/lib/i18n/types";
import type { PrayerTime } from "@/lib/types";

const PREVIEW_NOTICE: Record<Locale, string> = {
  ar: "بيانات تجريبية للمعاينة فقط — ليست مواقيت صلاة رسمية.",
  en: "Preview data only — these are not official prayer times.",
  de: "Nur Vorschaudaten — dies sind keine offiziellen Gebetszeiten.",
  tr: "Yalnızca önizleme verisi — bunlar resmi namaz vakitleri değildir.",
};

function shiftTime(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = ((hour * 60 + minute + minutes) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function daysBetween(start: string, end: string) {
  const startMs = Date.parse(`${start}T12:00:00Z`);
  const endMs = Date.parse(`${end}T12:00:00Z`);
  return Math.round((endMs - startMs) / 86_400_000);
}

/**
 * Temporary UI-only prayer preview data for pre-release review.
 * Never feed these rows into cron/reminder delivery or persist them to Supabase.
 * Real published prayer rows must always take precedence.
 */
export function getPrayerPreviewMockData(
  startDate?: string,
  endDate?: string,
  now = new Date(),
): PrayerTime[] {
  const today = todayIso(now);
  const start = startDate || addDaysIso(today, -30);
  const end = endDate || addDaysIso(today, 90);
  const count = Math.max(0, daysBetween(start, end));
  const updatedAt = now.toISOString();

  return Array.from({ length: count + 1 }, (_, index) => {
    const date = addDaysIso(start, index);
    const relativeDay = daysBetween(today, date);
    const microShift = ((relativeDay % 7) + 7) % 7 - 3;

    const fajr = shiftTime("04:35", microShift);
    const sunrise = shiftTime("06:05", microShift);
    const dhuhr = shiftTime("13:15", Math.round(microShift / 2));
    const asr = shiftTime("17:05", Math.round(microShift / 2));
    const maghrib = shiftTime("20:40", -microShift);
    const isha = shiftTime("22:10", -microShift);

    return {
      id: `preview-prayer-${date}`,
      date,
      fajr,
      sunrise,
      dhuhr,
      asr,
      maghrib,
      isha,
      fajrIqama: shiftTime(fajr, 20),
      dhuhrIqama: shiftTime(dhuhr, 15),
      asrIqama: shiftTime(asr, 15),
      maghribIqama: shiftTime(maghrib, 5),
      ishaIqama: shiftTime(isha, 10),
      note: PREVIEW_NOTICE.en,
      noteAr: PREVIEW_NOTICE.ar,
      noteEn: PREVIEW_NOTICE.en,
      noteDe: PREVIEW_NOTICE.de,
      noteTr: PREVIEW_NOTICE.tr,
      published: true,
      updatedAt,
    };
  });
}

export function getPrayerPreviewNotice(locale: Locale) {
  return PREVIEW_NOTICE[locale];
}
