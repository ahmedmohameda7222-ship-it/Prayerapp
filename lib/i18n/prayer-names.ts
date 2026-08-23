import type { Locale } from "./types";

const PRAYER_TRANSLATION_OVERRIDES: Record<Locale, Record<string, string>> = {
  ar: {
    "prayer.fajr": "الفجر",
    "prayer.sunrise": "الشروق",
    "prayer.dhuhr": "الظهر",
    "prayer.asr": "العصر",
    "prayer.maghrib": "المغرب",
    "prayer.isha": "العشاء",
    "prayer.salatFajr": "صلاة الفجر",
    "prayer.salatMaghrib": "صلاة المغرب",
    "prayer.salatIsha": "صلاة العشاء",
  },
  en: {
    "prayer.fajr": "Fajr",
    "prayer.sunrise": "Sunrise",
    "prayer.dhuhr": "Dhuhr",
    "prayer.asr": "Asr",
    "prayer.maghrib": "Maghrib",
    "prayer.isha": "Isha",
    "prayer.salatFajr": "Salat Fajr",
    "prayer.salatMaghrib": "Salat Maghrib",
    "prayer.salatIsha": "Salat Isha",
  },
  de: {
    "prayer.fajr": "Fajr",
    "prayer.sunrise": "Sonnenaufgang",
    "prayer.dhuhr": "Dhuhr",
    "prayer.asr": "Asr",
    "prayer.maghrib": "Maghrib",
    "prayer.isha": "Isha",
    "prayer.salatFajr": "Salat Fajr",
    "prayer.salatMaghrib": "Salat Maghrib",
    "prayer.salatIsha": "Salat Isha",
  },
  tr: {
    "prayer.fajr": "Sabah",
    "prayer.sunrise": "Güneş",
    "prayer.dhuhr": "Öğle",
    "prayer.asr": "İkindi",
    "prayer.maghrib": "Akşam",
    "prayer.isha": "Yatsı",
    "prayer.salatFajr": "Sabah Namazı",
    "prayer.salatMaghrib": "Akşam Namazı",
    "prayer.salatIsha": "Yatsı Namazı",
  },
};

export function getPrayerTranslationOverride(locale: Locale, key: string): string | null {
  return PRAYER_TRANSLATION_OVERRIDES[locale][key] || null;
}
