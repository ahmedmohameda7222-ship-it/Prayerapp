import { NextResponse } from "next/server";
import { addDaysIso, todayIso, zonedDateTime } from "@/lib/date-utils";
import { prayerEventId } from "@/lib/android/prayer-event-id";
import {
  NATIVE_DELIVERY_GRACE_MS,
  nativeDeliveryCapability,
  nativeFallbackDecision,
  type NativeAuthorityLease,
  type NativeDeliveryKind,
} from "@/lib/android/native-authority";
import { isPrayerScheduleQaRow } from "@/lib/launch-data-readiness";
import {
  deliverPrayerReminderEvent,
  prayerNames,
  type ReminderLeadMinutes,
  type ReminderPrayer,
} from "@/lib/prayer-reminder-delivery";
import type { PushSubscriptionRecord } from "@/lib/push/types";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supportedLeadMinutes = [5, 10, 15] as const;
const PRAYER_PUSH_EXPIRY_MS = 5 * 60 * 1000;

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
  note_ar: string | null;
  note_en: string | null;
  note_de: string | null;
  note_tr: string | null;
};

type NativeReceiptRow = {
  installation_id: string;
  account_generation: number;
};

function normalizeLeadMinutes(value: number | null): ReminderLeadMinutes {
  return value === 5 || value === 10 || value === 15 ? value : 0;
}

function isDue(nowMs: number, targetMs: number, lookbackMs: number) {
  const age = nowMs - targetMs;
  return age >= 0 && age <= lookbackMs;
}

function groupNativeLeasesByPushId(leases: NativeAuthorityLease[] | null) {
  const result = new Map<string, NativeAuthorityLease[]>();
  for (const lease of leases || []) {
    if (!lease.push_subscription_id) continue;
    const existing = result.get(lease.push_subscription_id) || [];
    existing.push(lease);
    result.set(lease.push_subscription_id, existing);
  }
  return result;
}

async function fallbackTargetsForEvent({
  client,
  targets,
  leasesByPushId,
  kind,
  eventId,
  dueAtMs,
  now,
}: {
  client: NonNullable<ReturnType<typeof createServerClient>>;
  targets: PushSubscriptionRecord[];
  leasesByPushId: Map<string, NativeAuthorityLease[]>;
  kind: NativeDeliveryKind;
  eventId: string;
  dueAtMs: number;
  now: Date;
}) {
  const candidateLeases = targets.flatMap((target) =>
    (leasesByPushId.get(target.id) || []).filter((lease) =>
      lease.receipt_v2 === true
      && Boolean(lease.installation_id)
      && Number.isInteger(lease.account_generation)
      && (lease.account_generation as number) >= 0
      && nativeDeliveryCapability(lease, kind, now),
    ),
  );

  const receiptInstallationIds = new Set<string>();
  let receiptLookupFailed = false;

  if (now.getTime() - dueAtMs >= NATIVE_DELIVERY_GRACE_MS && candidateLeases.length > 0) {
    const installationIds = [...new Set(
      candidateLeases.map((lease) => lease.installation_id as string),
    )];
    const expectedGeneration = new Map(
      candidateLeases.map((lease) => [
        lease.installation_id as string,
        lease.account_generation as number,
      ]),
    );

    const { data, error } = await client
      .from("native_prayer_delivery_receipts")
      .select("installation_id, account_generation")
      .eq("event_id", eventId)
      .gt("expires_at", now.toISOString())
      .in("installation_id", installationIds);

    if (error) {
      receiptLookupFailed = true;
      console.warn("[prayer reminder cron] native receipt lookup failed open", error.message);
    } else {
      for (const receipt of (data || []) as NativeReceiptRow[]) {
        if (expectedGeneration.get(receipt.installation_id) === receipt.account_generation) {
          receiptInstallationIds.add(receipt.installation_id);
        }
      }
    }
  }

  const subscriptions: PushSubscriptionRecord[] = [];
  let waiting = 0;
  let nativeDelivered = 0;

  for (const target of targets) {
    const leases = leasesByPushId.get(target.id) || [];
    if (leases.length === 0) {
      subscriptions.push(target);
      continue;
    }

    const decisions = leases.map((lease) => nativeFallbackDecision({
      targetId: target.id,
      lease,
      kind,
      now,
      dueAtMs,
      receiptInstallationIds,
      receiptLookupFailed,
    }));

    if (decisions.includes("suppress")) {
      nativeDelivered += 1;
    } else if (decisions.includes("wait")) {
      waiting += 1;
    } else {
      subscriptions.push(target);
    }
  }

  return { subscriptions, waiting, nativeDelivered };
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
  const { error: receiptCleanupError } = await client
    .from("native_prayer_delivery_receipts")
    .delete()
    .lt("expires_at", now.toISOString());
  if (receiptCleanupError) {
    console.warn("[prayer reminder cron] native receipt cleanup failed", receiptCleanupError.message);
  }

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
      .select("id, date, fajr, dhuhr, asr, maghrib, isha, note, note_ar, note_en, note_de, note_tr")
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
  if (userIds.length === 0) {
    return NextResponse.json({ success: true, due: 0, sent: 0, failed: 0, waiting: 0, nativeDelivered: 0 });
  }

  const { data: subscriptions, error: subscriptionsError } = await client
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, locale, user_id")
    .eq("enabled", true)
    .in("user_id", userIds);

  if (subscriptionsError) {
    console.error("[prayer reminder cron] subscription query failed", subscriptionsError.message);
    return NextResponse.json({ error: "Could not load reminder subscriptions" }, { status: 500 });
  }

  const pushTargets = (subscriptions || []) as PushSubscriptionRecord[];
  let nativeLeases: NativeAuthorityLease[] | null = null;
  if (pushTargets.length > 0) {
    const { data: leaseData, error: leaseError } = await client
      .from("native_prayer_installations")
      .select("installation_id, push_subscription_id, receipt_v2, account_generation, native_ready, notification_permission, notification_delivery_enabled, reminder_channel_enabled, adhan_channel_enabled, exact_alarm_permission, schedule_fresh, alarm_schedule_installed, audio_ready, engine_healthy, schedule_valid_until, lease_expires_at")
      .in("push_subscription_id", pushTargets.map((target) => target.id));
    if (leaseError) {
      console.warn("[prayer reminder cron] native authority lookup failed open", leaseError.message);
    } else {
      nativeLeases = (leaseData || []) as NativeAuthorityLease[];
    }
  }

  const leasesByPushId = groupNativeLeasesByPushId(nativeLeases);
  const prayerSchedules = ((schedules || []) as PrayerScheduleRow[])
    .filter((schedule) => !isPrayerScheduleQaRow(schedule));
  let due = 0;
  let sent = 0;
  let failed = 0;
  let waiting = 0;
  let nativeDelivered = 0;
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
        const matching = pushTargets.filter(
          (subscription) => subscription.user_id && reminderUsers.has(subscription.user_id),
        );
        if (matching.length === 0) continue;
        due += matching.length;

        const eventId = prayerEventId({
          scheduleId: schedule.id,
          scheduleRevision: time,
          date: schedule.date,
          prayer,
          kind: "reminder",
          leadMinutes,
        });
        const fallback = await fallbackTargetsForEvent({
          client,
          targets: matching,
          leasesByPushId,
          kind: "reminder",
          eventId,
          dueAtMs: prePrayerAt,
          now,
        });
        waiting += fallback.waiting;
        nativeDelivered += fallback.nativeDelivered;
        if (fallback.subscriptions.length === 0) continue;

        const result = await deliverPrayerReminderEvent({
          eventId,
          dueAt: new Date(prePrayerAt).toISOString(),
          expiresAt: new Date(prePrayerAt + PRAYER_PUSH_EXPIRY_MS).toISOString(),
          prayer,
          date: schedule.date,
          leadMinutes,
          sourceId: schedule.id,
          subscriptions: fallback.subscriptions,
        });
        sent += result.sent;
        failed += result.failed;
      }

      if (!isDue(nowMs, adhanAt, adhanLookbackMs)) continue;
      const adhanUsers = new Set(prayerPreferences.map((item) => item.user_id));
      const matching = pushTargets.filter(
        (subscription) => subscription.user_id && adhanUsers.has(subscription.user_id),
      );
      if (matching.length === 0) continue;
      due += matching.length;

      const eventId = prayerEventId({
        scheduleId: schedule.id,
        scheduleRevision: time,
        date: schedule.date,
        prayer,
        kind: "adhan",
        leadMinutes: 0,
      });
      const fallback = await fallbackTargetsForEvent({
        client,
        targets: matching,
        leasesByPushId,
        kind: "adhan",
        eventId,
        dueAtMs: adhanAt,
        now,
      });
      waiting += fallback.waiting;
      nativeDelivered += fallback.nativeDelivered;
      if (fallback.subscriptions.length === 0) continue;

      const result = await deliverPrayerReminderEvent({
        eventId,
        dueAt: new Date(adhanAt).toISOString(),
        expiresAt: new Date(adhanAt + PRAYER_PUSH_EXPIRY_MS).toISOString(),
        prayer,
        date: schedule.date,
        leadMinutes: 0,
        sourceId: schedule.id,
        subscriptions: fallback.subscriptions,
      });
      sent += result.sent;
      failed += result.failed;
    }
  }

  return NextResponse.json({ success: true, due, sent, failed, waiting, nativeDelivered });
}
