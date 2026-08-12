import { NextResponse } from "next/server";
import type { Locale } from "@/lib/i18n/types";
import { addDaysIso, todayIso, zonedDateTime } from "@/lib/date-utils";
import { deliverPushNotifications } from "@/lib/push/web-push";
import type { PushSubscriptionRecord } from "@/lib/push/types";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prayerNames = {
  fajr: { ar: "الفجر", en: "Fajr", de: "Fajr", tr: "Sabah" },
  dhuhr: { ar: "الظهر", en: "Dhuhr", de: "Dhuhr", tr: "Öğle" },
  asr: { ar: "العصر", en: "Asr", de: "Asr", tr: "İkindi" },
  maghrib: { ar: "المغرب", en: "Maghrib", de: "Maghrib", tr: "Akşam" },
  isha: { ar: "العشاء", en: "Isha", de: "Isha", tr: "Yatsı" },
} as const;

type ReminderPrayer = keyof typeof prayerNames;
type PrayerScheduleRow = {
  id: string;
  date: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

const reminderTitles: Record<Locale, string> = {
  ar: "تذكير الصلاة",
  en: "Prayer reminder",
  de: "Gebetserinnerung",
  tr: "Namaz hatırlatması",
};

function reminderBody(locale: Locale, prayer: ReminderPrayer) {
  const name = prayerNames[prayer][locale];
  return {
    ar: `حان الآن وقت صلاة ${name}.`,
    en: `It is time for ${name}.`,
    de: `Es ist Zeit für ${name}.`,
    tr: `${name} namazı vakti geldi.`,
  }[locale];
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const now = new Date();
  const today = todayIso(now);
  const tomorrow = addDaysIso(today, 1);
  const [{ data: reminders, error: remindersError }, { data: schedules, error: schedulesError }] = await Promise.all([
    client
      .from("user_prayer_reminders")
      .select("user_id, prayer")
      .eq("enabled", true),
    client
      .from("prayer_times")
      .select("id, date, fajr, dhuhr, asr, maghrib, isha")
      .eq("published", true)
      .gte("date", today)
      .lte("date", tomorrow),
  ]);

  if (remindersError || schedulesError) {
    console.error("[prayer reminder cron] query failed", remindersError?.message || schedulesError?.message);
    return NextResponse.json({ error: "Could not load reminder data" }, { status: 500 });
  }

  const enabledReminders = (reminders || []) as Array<{ user_id: string; prayer: ReminderPrayer }>;
  const userIds = [...new Set(enabledReminders.map((item) => item.user_id))];
  if (userIds.length === 0) return NextResponse.json({ success: true, due: 0, sent: 0, failed: 0 });

  const { data: subscriptions, error: subscriptionsError } = await client
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, locale, user_id")
    .eq("enabled", true)
    .in("user_id", userIds);

  if (subscriptionsError) {
    console.error("[prayer reminder cron] subscription query failed", subscriptionsError.message);
    return NextResponse.json({ error: "Could not load reminder subscriptions" }, { status: 500 });
  }

  const targets = (subscriptions || []) as PushSubscriptionRecord[];
  const prayerSchedules = (schedules || []) as PrayerScheduleRow[];
  let due = 0;
  let sent = 0;
  let failed = 0;
  const lookbackMs = 5 * 60 * 1000;

  for (const schedule of prayerSchedules) {
    for (const prayer of Object.keys(prayerNames) as ReminderPrayer[]) {
      const time = schedule[prayer];
      const reminderAt = zonedDateTime(schedule.date, time).getTime();
      const age = now.getTime() - reminderAt;
      if (age < 0 || age > lookbackMs) continue;

      const reminderUsers = new Set(
        enabledReminders.filter((item) => item.prayer === prayer).map((item) => item.user_id),
      );
      const matching = targets.filter((subscription) => subscription.user_id && reminderUsers.has(subscription.user_id));
      if (matching.length === 0) continue;
      due += matching.length;

      const eventKey = `prayer:${schedule.date}:${prayer}:${time}`;
      const result = await deliverPushNotifications({
        eventKey,
        notificationType: "prayer_reminder",
        sourceId: schedule.id,
        subscriptions: matching,
        payloadForLocale: (locale) => ({
          title: reminderTitles[locale],
          body: reminderBody(locale, prayer),
          url: "/",
          tag: eventKey,
        }),
      });
      sent += result.sent;
      failed += result.failed;
    }
  }

  return NextResponse.json({ success: true, due, sent, failed });
}
