import { NextResponse } from "next/server";
import type { Locale } from "@/lib/i18n/types";
import { addDaysIso, todayIso, zonedDateTime } from "@/lib/date-utils";
import { deliverPushNotifications } from "@/lib/push/web-push";
import type { PrayerReminderMinutes, PushSubscriptionRecord } from "@/lib/push/types";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prayerNames: Record<string, Record<Locale, string>> = {
  fajr: { ar: "الفجر", en: "Fajr", de: "Fajr", tr: "Sabah" },
  dhuhr: { ar: "الظهر", en: "Dhuhr", de: "Dhuhr", tr: "Öğle" },
  asr: { ar: "العصر", en: "Asr", de: "Asr", tr: "İkindi" },
  maghrib: { ar: "المغرب", en: "Maghrib", de: "Maghrib", tr: "Akşam" },
  isha: { ar: "العشاء", en: "Isha", de: "Isha", tr: "Yatsı" },
};

const reminderTitles: Record<Locale, string> = {
  ar: "تذكير الصلاة",
  en: "Prayer reminder",
  de: "Gebetserinnerung",
  tr: "Namaz hatırlatması",
};

function reminderBody(locale: Locale, prayer: string, minutes: Exclude<PrayerReminderMinutes, null>) {
  const name = prayerNames[prayer][locale];
  if (minutes === 0) {
    return {
      ar: `حان الآن وقت صلاة ${name}.`,
      en: `It is time for ${name}.`,
      de: `Es ist Zeit für ${name}.`,
      tr: `${name} namazı vakti geldi.`,
    }[locale];
  }
  return {
    ar: `متبقي ${minutes} دقيقة على صلاة ${name}.`,
    en: `${name} begins in ${minutes} minutes.`,
    de: `${name} beginnt in ${minutes} Minuten.`,
    tr: `${name} namazına ${minutes} dakika kaldı.`,
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
  const [{ data: subscriptions, error: subscriptionsError }, { data: schedules, error: schedulesError }] = await Promise.all([
    client
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, locale, prayer_reminder_minutes")
      .eq("enabled", true)
      .not("prayer_reminder_minutes", "is", null),
    client
      .from("prayer_times")
      .select("id, date, fajr, dhuhr, asr, maghrib, isha")
      .eq("published", true)
      .gte("date", today)
      .lte("date", tomorrow),
  ]);

  if (subscriptionsError || schedulesError) {
    console.error("[prayer reminder cron] query failed", subscriptionsError?.message || schedulesError?.message);
    return NextResponse.json({ error: "Could not load reminder data" }, { status: 500 });
  }

  const targets = (subscriptions || []) as PushSubscriptionRecord[];
  let due = 0;
  let sent = 0;
  let failed = 0;
  const lookbackMs = 5 * 60 * 1000;

  for (const schedule of schedules || []) {
    for (const prayer of Object.keys(prayerNames)) {
      const time = schedule[prayer as keyof typeof schedule];
      if (typeof time !== "string") continue;

      for (const minutes of [0, 5, 10, 15, 30] as const) {
        const reminderAt = zonedDateTime(schedule.date, time).getTime() - minutes * 60 * 1000;
        const age = now.getTime() - reminderAt;
        if (age < 0 || age > lookbackMs) continue;

        const matching = targets.filter((subscription) => subscription.prayer_reminder_minutes === minutes);
        if (matching.length === 0) continue;
        due += matching.length;

        const eventKey = `prayer:${schedule.date}:${prayer}:${time}:${minutes}`;
        const result = await deliverPushNotifications({
          eventKey,
          notificationType: "prayer_reminder",
          sourceId: schedule.id,
          subscriptions: matching,
          payloadForLocale: (locale) => ({
            title: reminderTitles[locale],
            body: reminderBody(locale, prayer, minutes),
            url: "/times",
            tag: eventKey,
          }),
        });
        sent += result.sent;
        failed += result.failed;
      }
    }
  }

  return NextResponse.json({ success: true, due, sent, failed });
}
