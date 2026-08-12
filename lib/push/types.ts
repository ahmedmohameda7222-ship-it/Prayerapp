import type { Locale } from "@/lib/i18n/types";

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
  user_id?: string | null;
}

export interface LocalizedText {
  ar?: string | null;
  en?: string | null;
  de?: string | null;
  tr?: string | null;
  fallback: string;
}
