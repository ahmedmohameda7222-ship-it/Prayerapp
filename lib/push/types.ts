import type { Locale } from "@/lib/i18n/types";

export type PrayerReminderMinutes = null | 0 | 5 | 10 | 15 | 30;

export type PushNotificationType =
  | "urgent_announcement"
  | "event"
  | "donation_campaign"
  | "friday_announcement"
  | "prayer_reminder";

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  locale: Locale;
  prayer_reminder_minutes: PrayerReminderMinutes;
}

export interface LocalizedText {
  ar?: string | null;
  en?: string | null;
  de?: string | null;
  tr?: string | null;
  fallback: string;
}
