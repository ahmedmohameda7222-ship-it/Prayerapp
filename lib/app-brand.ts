import type { Locale } from "@/lib/i18n/types";

export const APP_NAMES = {
  ar: "مسجد الدوناو",
  en: "Danube Mosque",
  de: "Donau-Moschee",
  tr: "Tuna Camii",
} as const satisfies Record<Locale, string>;

export const ASSOCIATION_NAME = "Deggendorfer Integrations und Bildungsverein e.V";

export const DEFAULT_APP_NAME = APP_NAMES.ar;

const BRAND_TRANSLATION_OVERRIDES: Record<Locale, Record<string, string>> = {
  ar: {
    "common.appIconAlt": "أيقونة تطبيق مسجد الدوناو",
    "settings.installAppDescription": "أضف مسجد الدوناو إلى الشاشة الرئيسية للوصول السريع واستقبال الإشعارات في الخلفية.",
    "notificationPrompt.iosBody": "على iPhone أو iPad، أضف مسجد الدوناو إلى الشاشة الرئيسية قبل تفعيل الإشعارات.",
  },
  en: {
    "common.appIconAlt": "Danube Mosque app icon",
    "settings.installAppDescription": "Add Danube Mosque to your home screen for quick access and background notifications.",
    "notificationPrompt.iosBody": "On iPhone or iPad, add Danube Mosque to your Home Screen before enabling notifications.",
  },
  de: {
    "common.appIconAlt": "App-Symbol der Donau-Moschee",
    "settings.installAppDescription": "Füge die Donau-Moschee für schnellen Zugriff und Hintergrund-Benachrichtigungen zum Startbildschirm hinzu.",
    "notificationPrompt.iosBody": "Füge die Donau-Moschee auf dem iPhone oder iPad zum Startbildschirm hinzu, bevor du Benachrichtigungen aktivierst.",
  },
  tr: {
    "common.appIconAlt": "Tuna Camii uygulama simgesi",
    "settings.installAppDescription": "Hızlı erişim ve arka plan bildirimleri için Tuna Camii'ni ana ekranınıza ekleyin.",
    "notificationPrompt.iosBody": "iPhone veya iPad'de bildirimleri etkinleştirmeden önce Tuna Camii'ni Ana Ekran'a ekleyin.",
  },
};

export function getBrandTranslationOverride(locale: Locale, key: string) {
  return BRAND_TRANSLATION_OVERRIDES[locale]?.[key];
}
