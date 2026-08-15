import { addDaysIso, todayIso } from "@/lib/date-utils";
import type { Locale } from "@/lib/i18n/types";
import type { PrayerTime } from "@/lib/types";

const PREVIEW_NOTICE: Record<Locale, string> = {
  ar: "بيانات تجريبية للمعاينة فقط — ليست مواقيت صلاة رسمية.",
  en: "Preview data only — these are not official prayer times.",
  de: "Nur Vorschaudaten — dies sind keine offiziellen Gebetszeiten.",
  tr: "Yalnızca önizleme verisi — bunlar resmi namaz vakitleri değildir.",
};

const HARDCODED_UPDATED_AT = "2026-08-15T00:00:00.000Z";

function previewPrayer(
  date: string,
  fajr: string,
  sunrise: string,
  dhuhr: string,
  asr: string,
  maghrib: string,
  isha: string,
  fajrIqama: string,
  dhuhrIqama: string,
  asrIqama: string,
  maghribIqama: string,
  ishaIqama: string,
): PrayerTime {
  return {
    id: `hardcoded-prayer-${date}`,
    date,
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    fajrIqama,
    dhuhrIqama,
    asrIqama,
    maghribIqama,
    ishaIqama,
    note: PREVIEW_NOTICE.en,
    noteAr: PREVIEW_NOTICE.ar,
    noteEn: PREVIEW_NOTICE.en,
    noteDe: PREVIEW_NOTICE.de,
    noteTr: PREVIEW_NOTICE.tr,
    published: true,
    updatedAt: HARDCODED_UPDATED_AT,
  };
}

/**
 * Temporary hard-coded QA schedule for 15–21 August 2026.
 * It intentionally wins over remote data for these dates during development so
 * Home and Prayer Times always have deterministic rows to render.
 */
export const HARDCODED_PRAYER_WEEK: PrayerTime[] = [
  previewPrayer("2026-08-15", "04:10", "05:56", "13:12", "17:08", "20:32", "22:05", "04:30", "13:27", "17:23", "20:37", "22:15"),
  previewPrayer("2026-08-16", "04:12", "05:57", "13:12", "17:07", "20:30", "22:03", "04:32", "13:27", "17:22", "20:35", "22:13"),
  previewPrayer("2026-08-17", "04:14", "05:59", "13:12", "17:06", "20:28", "22:01", "04:34", "13:27", "17:21", "20:33", "22:11"),
  previewPrayer("2026-08-18", "04:16", "06:00", "13:11", "17:05", "20:26", "21:59", "04:36", "13:26", "17:20", "20:31", "22:09"),
  previewPrayer("2026-08-19", "04:18", "06:02", "13:11", "17:04", "20:24", "21:57", "04:38", "13:26", "17:19", "20:29", "22:07"),
  previewPrayer("2026-08-20", "04:20", "06:03", "13:11", "17:03", "20:22", "21:55", "04:40", "13:26", "17:18", "20:27", "22:05"),
  previewPrayer("2026-08-21", "04:22", "06:05", "13:11", "17:02", "20:20", "21:53", "04:42", "13:26", "17:17", "20:25", "22:03"),
];

export function getHardcodedPrayerWeekData(startDate?: string, endDate?: string): PrayerTime[] {
  return HARDCODED_PRAYER_WEEK.filter((item) => {
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });
}

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
 * General temporary UI-only prayer preview generator kept for ranges outside
 * the fixed QA week. Never persist these rows or feed them into delivery jobs.
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
