import type { Locale } from "./types";

const ADMIN_PERFORMANCE_MESSAGES: Record<Locale, Record<string, string>> = {
  ar: {
    "admin.prayerEngine": "محرك مواقيت الصلاة",
    "admin.prayerTimesWindow": "نطاق مواقيت الصلاة المحمّل",
    "admin.prayerTimesWindowRange": "عرض {range}",
    "admin.previousWindow": "السابق",
    "admin.currentWindow": "الحالي",
    "admin.nextWindow": "التالي",
  },
  en: {
    "admin.prayerEngine": "Prayer Engine",
    "admin.prayerTimesWindow": "Loaded prayer-times window",
    "admin.prayerTimesWindowRange": "Showing {range}",
    "admin.previousWindow": "Previous",
    "admin.currentWindow": "Current",
    "admin.nextWindow": "Next",
  },
  de: {
    "admin.prayerEngine": "Gebetszeiten-Engine",
    "admin.prayerTimesWindow": "Geladenes Gebetszeiten-Fenster",
    "admin.prayerTimesWindowRange": "Zeitraum {range}",
    "admin.previousWindow": "Zurück",
    "admin.currentWindow": "Aktuell",
    "admin.nextWindow": "Weiter",
  },
  tr: {
    "admin.prayerEngine": "Namaz Motoru",
    "admin.prayerTimesWindow": "Yüklenen namaz vakti aralığı",
    "admin.prayerTimesWindowRange": "Gösterilen aralık: {range}",
    "admin.previousWindow": "Önceki",
    "admin.currentWindow": "Güncel",
    "admin.nextWindow": "Sonraki",
  },
};

export function getAdminPerformanceTranslationOverride(locale: Locale, key: string) {
  return ADMIN_PERFORMANCE_MESSAGES[locale]?.[key];
}
