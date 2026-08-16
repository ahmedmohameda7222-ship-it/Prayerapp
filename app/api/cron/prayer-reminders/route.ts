import { NextResponse } from "next/server";
import type { Locale } from "@/lib/i18n/types";
import { addDaysIso, todayIso, zonedDateTime } from "@/lib/date-utils";
import { deliverPushNotifications } from "@/lib/push/web-push";
import type { PushSubscriptionRecord } from "@/lib/push/types";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QA_MOCK_MARKER = "SUPABASE_QA_MOCK";
const supportedLeadMinutes = [5, 10, 15] as const;

const prayerNames = {
  fajr: { ar: "الفجر", en: "Fajr", de: "Fajr", tr: "Sabah" },
  dhuhr: { ar: "الظهر", en: "Dhuhr", de: "Dhuhr", tr: "Öğle" },
  asr: { ar: "العصر", en: "Asr", de: "Asr", tr: "İkindi" },
  maghrib: { ar: "المغرب", en: "Maghrib", de: "Maghrib", tr: "Akşam" },
  isha: { ar: "العشاء", en: "Isha", de: "Isha", tr: "Yatsı" },
} as const;

type ReminderPrayer = keyof typeof prayerNames;
type ReminderLeadMinutes = 0 | 5 | 10 | 15;
type ReminderPreferenceRow = {
  user_id: string;
  prayer: ReminderPrayer;
  lead_minutes: ReminderLeadMinutes | null;
};
type PrayerScheduleRow = {
  id: string;
  date: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  note: string | null;
};

const reminderTitles: Record<Locale, string> = {
  ar: "تذكير الصلاة",
  en: "Prayer reminder",
  de: "Gebetserinnerung",
  tr: "Namaz hatırlatması",
};

function adhanReminderBody(locale: Locale, prayer: ReminderPrayer) {
  const name = prayerNames[prayer][locale];
  return {
    ar: `حان الآن موعد أذان ${name}.`,
    en: `It is now time for the ${name} Adhan.`,
    de: `Jetzt ist die Adhan-Zeit für ${name}.`,
    tr: `${name} ezanı vakti geldi.`,
  }[locale];
}

function beforeReminderBody(locale: Locale, prayer: ReminderPrayer, minutes: number) {
  const name = prayerNames[prayer][locale];
  return {
    ar: `تبقّى ${minutes} دقيقة على أذان ${name}.`,
    en: `${name} Adhan is in ${minutes} minutes.`,
    de: `Der Adhan für ${name} ist in ${minutes} Minuten.`,
    tr: `${name} ezanına ${minutes} dakika kaldı.`,
  }[locale];
}

function normalizeLeadMinutes(value: number | null): ReminderLeadMinutes {
  return value === 5 || value === 10 || value === 15 ? value : 0;
}

function isDue(nowMs: number, targetMs: number, lookbackMs: number) {
  const age = nowMs - targetMs;
  return age >= 0 && age <= lookbackMs;
}

async function isAuthorizedCron(
  request: Request,
  client: NonNullable<ReturnType<typeof createServerClient>>,
) {
  const configuredSecret = process.env.CRON_SECRET;
  if (configuredSecret && request.headers.get("authorization") === `Bearer ${configuredSecret}`) {
    return true;
  }

  const databaseToken = request.headers.get("x-cron-token");
  if (!databaseToken || databaseToken.length > 256) return false;
  const { data, error } = await client.rpc("verify_prayer_reminder_cron_token", {
    candidate: databaseToken,
  });
  return !error && data === true;
}

export async function GET(request: Request) {
  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  if (!(await isAuthorizedCron(request, client))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const nowMs = now.getTime();
  const today = todayIso(now);
  const tomorrow = addDaysIso(today, 1);
  const [{ data: reminders, error: remindersError }, { data: schedules, error: schedulesError }] = await Promise.all([
    client
      .from("user_prayer_reminders")
      .select("user_id, prayer, lead_minutes")
      .eq("enabled", true),
    client
      .from("prayer_times")
      .select("id, date, fajr, dhuhr, asr, maghrib, isha, note")
      .eq("published", true)
      .gte("date", today)
      .lte("date", tomorrow),
  ]);

  if (remindersError || schedulesError) {
    console.error("[prayer reminder cron] query failed", remindersError?.message || schedulesError?.message);
    return NextResponse.json({ error: "Could not load reminder data" }, { status: 500 });
  }

  const enabledReminders = ((reminders || []) as ReminderPreferenceRow[]).map((item) => ({
    ...item,
    lead_minutes: normalizeLeadMinutes(item.lead_minutes),
  }));
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
  const prayerSchedules = ((schedules || []) as PrayerScheduleRow[])
    .filter((schedule) => schedule.note !== QA_MOCK_MARKER);
  let due = 0;
  let sent = 0;
  let failed = 0;
  const adhanLookbackMs = 5 * 60 * 1000;
  const prePrayerLookbackMs = 2 * 60 * 1000;

  for (const schedule of prayerSchedules) {
    for (const prayer of Object.keys(prayerNames) as ReminderPrayer[]) {
      const time = schedule[prayer];
      const adhanAt = zonedDateTime(schedule.date, time).getTime();
      const prayerPreferences = enabledReminders.filter((item) => item.prayer === prayer);
      if (prayerPreferences.length === 0) continue;

      for (const leadMinutes of supportedLeadMinutes) {
        const prePrayerAt = adhanAt - leadMinutes * 60 * 1000;
        if (nowMs >= adhanAt || !isDue(nowMs, prePrayerAt, prePrayerLookbackMs)) continue;

        const reminderUsers = new Set(
          prayerPreferences
            .filter((item) => item.lead_minutes === leadMinutes)
            .map((item) => item.user_id),
        );
        if (reminderUsers.size === 0) continue;
        const matching = targets.filter((subscription) => subscription.user_id && reminderUsers.has(subscription.user_id));
        if (matching.length === 0) continue;
        due += matching.length;

        const eventKey = `prayer:${schedule.date}:${prayer}:${time}:before:${leadMinutes}`;
        const result = await deliverPushNotifications({
          eventKey,
          notificationType: "prayer_reminder",
          sourceId: schedule.id,
          subscriptions: matching,
          payloadForLocale: (locale) => ({
            title: reminderTitles[locale],
            body: beforeReminderBody(locale, prayer, leadMinutes),
            url: "/",
            tag: eventKey,
          }),
        });
        sent += result.sent;
        failed += result.failed;
      }

      if (!isDue(nowMs, adhanAt, adhanLookbackMs)) continue;
      const adhanUsers = new Set(prayerPreferences.map((item) => item.user_id));
      const matching = targets.filter((subscription) => subscription.user_id && adhanUsers.has(subscription.user_id));
      if (matching.length === 0) continue;
      due += matching.length;

      const eventKey = `prayer:${schedule.date}:${prayer}:${time}:adhan`;
      const result = await deliverPushNotifications({
        eventKey,
        notificationType: "prayer_reminder",
        sourceId: schedule.id,
        subscriptions: matching,
        payloadForLocale: (locale) => ({
          title: reminderTitles[locale],
          body: adhanReminderBody(locale, prayer),
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
