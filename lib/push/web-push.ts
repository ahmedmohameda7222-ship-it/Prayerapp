import "server-only";

import webpush from "web-push";
import type { Locale } from "@/lib/i18n/types";
import { createServerClient } from "@/lib/supabase/server";
import type {
  LocalizedText,
  PushNotificationType,
  PushSubscriptionRecord,
} from "@/lib/push/types";

const notificationTitles: Record<
  Exclude<PushNotificationType, "prayer_reminder">,
  Record<Locale, string>
> = {
  urgent_announcement: {
    ar: "خبر عاجل من المسجد",
    en: "Urgent mosque announcement",
    de: "Dringende Moschee-Mitteilung",
    tr: "Acil cami duyurusu",
  },
  event: {
    ar: "فعالية جديدة في المسجد",
    en: "New mosque event",
    de: "Neue Moschee-Veranstaltung",
    tr: "Yeni cami etkinliği",
  },
  donation_campaign: {
    ar: "حملة تبرع جديدة",
    en: "New donation campaign",
    de: "Neue Spendenaktion",
    tr: "Yeni bağış kampanyası",
  },
  friday_announcement: {
    ar: "إعلان صلاة الجمعة",
    en: "Friday prayer announcement",
    de: "Freitagsgebet-Mitteilung",
    tr: "Cuma namazı duyurusu",
  },
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function localized(text: LocalizedText, locale: Locale) {
  return text[locale]?.trim() || text.en?.trim() || text.fallback;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

interface DeliveryRequest {
  eventKey: string;
  notificationType: PushNotificationType;
  sourceId?: string;
  payloadForLocale: (locale: Locale) => PushPayload;
  subscriptions?: PushSubscriptionRecord[];
}

export async function deliverPushNotifications({
  eventKey,
  notificationType,
  sourceId,
  payloadForLocale,
  subscriptions,
}: DeliveryRequest) {
  if (!configureWebPush()) {
    return { configured: false, sent: 0, skipped: 0, failed: 0 };
  }

  const client = createServerClient();
  if (!client) throw new Error("Supabase server client is not configured");

  let targets = subscriptions;
  if (!targets) {
    const { data, error } = await client
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, locale, user_id")
      .eq("enabled", true);
    if (error) throw error;
    targets = (data || []) as PushSubscriptionRecord[];
  }

  const results = await Promise.all(
    targets.map(async (subscription) => {
      const { data: delivery, error: reserveError } = await client
        .from("push_notification_deliveries")
        .insert({
          event_key: eventKey,
          subscription_id: subscription.id,
          notification_type: notificationType,
          source_id: sourceId || null,
        })
        .select("id")
        .single();

      if (reserveError?.code === "23505") return "skipped" as const;
      if (reserveError || !delivery) throw reserveError || new Error("Could not reserve push delivery");

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payloadForLocale(subscription.locale)),
          { TTL: 60 * 60 * 24, urgency: notificationType === "urgent_announcement" ? "high" : "normal" }
        );

        await client
          .from("push_notification_deliveries")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", delivery.id);
        return "sent" as const;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? String(error.statusCode)
            : "unknown";

        await client
          .from("push_notification_deliveries")
          .update({ status: "failed", error_code: statusCode })
          .eq("id", delivery.id);

        if (statusCode === "404" || statusCode === "410") {
          await client
            .from("push_subscriptions")
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("id", subscription.id);
        }
        return "failed" as const;
      }
    })
  );

  return {
    configured: true,
    sent: results.filter((result) => result === "sent").length,
    skipped: results.filter((result) => result === "skipped").length,
    failed: results.filter((result) => result === "failed").length,
  };
}

export async function sendAdminContentPush({
  eventKey,
  notificationType,
  sourceId,
  url,
  contentTitle,
}: {
  eventKey: string;
  notificationType: Exclude<PushNotificationType, "prayer_reminder">;
  sourceId: string;
  url: string;
  contentTitle: LocalizedText;
}) {
  return deliverPushNotifications({
    eventKey,
    notificationType,
    sourceId,
    payloadForLocale: (locale) => ({
      title: notificationTitles[notificationType][locale],
      body: localized(contentTitle, locale),
      url,
      tag: eventKey,
    }),
  });
}
