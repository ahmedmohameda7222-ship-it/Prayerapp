import { addDaysIso, todayIso } from "@/lib/date-utils";
import type { JumuahTime } from "@/lib/types";

/**
 * Temporary pre-release fallback so the Friday experience can be reviewed with
 * realistic multi-service data before the mosque publishes its real schedule.
 * Real published Jumu'ah rows always take precedence. Remove this fallback
 * before release rather than promoting these values to production data.
 */
export function getFridayPreviewMockData(now = new Date()): JumuahTime[] {
  const today = todayIso(now);
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysUntilFriday = (5 - weekday + 7) % 7;
  const firstFriday = addDaysIso(today, daysUntilFriday);
  const secondFriday = addDaysIso(firstFriday, 7);

  return [firstFriday, secondFriday].flatMap((date) => [
    {
      id: `preview-${date}-1`,
      date,
      khutbahTime: "12:15",
      prayerTime: "12:30",
      locationName: "Masjid El-Rahman",
      locationAddress: "Deggendorf",
      language: "Arabic",
      languageAr: "العربية",
      languageEn: "Arabic",
      languageDe: "Arabisch",
      languageTr: "Arapça",
      notes: "Please arrive 10 minutes early.",
      notesAr: "يرجى الحضور قبل الصلاة بعشر دقائق.",
      notesEn: "Please arrive 10 minutes early.",
      notesDe: "Bitte 10 Minuten vor dem Gebet eintreffen.",
      notesTr: "Lütfen namazdan 10 dakika önce gelin.",
      published: true,
    },
    {
      id: `preview-${date}-2`,
      date,
      khutbahTime: "13:15",
      prayerTime: "13:30",
      locationName: "Masjid El-Rahman",
      locationAddress: "Deggendorf",
      language: "German",
      languageAr: "الألمانية",
      languageEn: "German",
      languageDe: "Deutsch",
      languageTr: "Almanca",
      notes: "Please arrive 10 minutes early.",
      notesAr: "يرجى الحضور قبل الصلاة بعشر دقائق.",
      notesEn: "Please arrive 10 minutes early.",
      notesDe: "Bitte 10 Minuten vor dem Gebet eintreffen.",
      notesTr: "Lütfen namazdan 10 dakika önce gelin.",
      published: true,
    },
    {
      id: `preview-${date}-3`,
      date,
      khutbahTime: "14:15",
      prayerTime: "14:30",
      locationName: "Masjid El-Rahman",
      locationAddress: "Deggendorf",
      language: "Turkish",
      languageAr: "التركية",
      languageEn: "Turkish",
      languageDe: "Türkisch",
      languageTr: "Türkçe",
      notes: "Please arrive 10 minutes early.",
      notesAr: "يرجى الحضور قبل الصلاة بعشر دقائق.",
      notesEn: "Please arrive 10 minutes early.",
      notesDe: "Bitte 10 Minuten vor dem Gebet eintreffen.",
      notesTr: "Lütfen namazdan 10 dakika önce gelin.",
      published: true,
    },
  ]);
}
