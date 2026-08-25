import "server-only";

import type { Locale } from "@/lib/i18n/types";
import { deliverPushNotifications } from "@/lib/push/web-push";
import type { PushSubscriptionRecord } from "@/lib/push/types";

export const prayerNames = {
  fajr: { ar: "الفجر", en: "Fajr", de: "Fajr", tr: "Sabah" },
  dhuhr: { ar: "الظهر", en: "Dhuhr", de: "Dhuhr", tr: "Öğle" },
  asr: { ar: "العصر", en: "Asr", de: "Asr", tr: "İkindi" },
  maghrib: { ar: "المغرب", en: "Maghrib", de: "Maghrib", tr: "Akşam" },
  isha: { ar: "العشاء", en: "Isha", de: "Isha", tr: "Yatsı" },
} as const;

export type ReminderPrayer = keyof typeof prayerNames;
export type ReminderLeadMinutes = 0 | 5 | 10 | 15;

const reminderTitles: Record<Locale, string> = {
  ar: "تذكير الصلاة",
  en: "Prayer reminder",
  de: "Gebetserinnerung",
  tr: "Namaz hatırlatması",
};

export function adhanReminderBody(locale: Locale, prayer: ReminderPrayer) {
  const name = prayerNames[prayer][locale];
  return {
    ar: `حان الآن موعد أذان ${name}.`,
    en: `It is now time for the ${name} Adhan.`,
    de: `Jetzt ist die Adhan-Zeit für ${name}.`,
    tr: `${name} ezanı vakti geldi.`,
  }[locale];
}

export function beforeReminderBody(locale: Locale, prayer: ReminderPrayer, minutes: number) {
  const name = prayerNames[prayer][locale];
  return {
    ar: `تبقّى ${minutes} دقيقة على أذان ${name}.`,
    en: `${name} Adhan is in ${minutes} minutes.`,
    de: `Der Adhan für ${name} ist in ${minutes} Minuten.`,
    tr: `${name} ezanına ${minutes} dakika kaldı.`,
  }[locale];
}

export async function deliverPrayerReminderEvent({
  eventId,
  dueAt,
  expiresAt,
  prayer,
  date,
  leadMinutes,
  subscriptions,
  sourceId,
}: {
  eventId: string;
  dueAt: string;
  expiresAt: string;
  prayer: ReminderPrayer;
  date: string;
  leadMinutes: ReminderLeadMinutes;
  subscriptions: PushSubscriptionRecord[];
  sourceId?: string;
}) {
  const isAdhan = leadMinutes === 0;

  return deliverPushNotifications({
    eventKey: eventId,
    notificationType: "prayer_reminder",
    sourceId,
    subscriptions,
    payloadForLocale: (locale) => ({
      title: reminderTitles[locale],
      body: isAdhan
        ? adhanReminderBody(locale, prayer)
        : beforeReminderBody(locale, prayer, leadMinutes),
      url: "/#prayer-times",
      tag: eventId,
      kind: isAdhan ? "adhan" : "prayer-reminder",
      prayer,
      date,
      eventId,
      dueAt,
      expiresAt,
    }),
  });
}
