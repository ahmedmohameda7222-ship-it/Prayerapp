import type { PushSubscriptionRecord } from "@/lib/push/types";

export type NativeAuthorityLease = {
  push_subscription_id: string | null;
  native_ready: boolean;
  notification_permission: boolean;
  notification_delivery_enabled: boolean;
  reminder_channel_enabled: boolean;
  adhan_channel_enabled: boolean;
  exact_alarm_permission: boolean;
  schedule_fresh: boolean;
  alarm_schedule_installed: boolean;
  audio_ready: boolean;
  engine_healthy: boolean;
  schedule_valid_until: string | null;
  lease_expires_at: string | null;
};

function isFuture(value: string | null, nowMs: number) {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > nowMs;
}

function leaseIsHealthy(lease: NativeAuthorityLease, nowMs: number) {
  return lease.native_ready
    && lease.notification_permission
    && lease.notification_delivery_enabled
    && lease.reminder_channel_enabled
    && lease.adhan_channel_enabled
    && lease.exact_alarm_permission
    && lease.schedule_fresh
    && lease.alarm_schedule_installed
    && lease.audio_ready
    && lease.engine_healthy
    && isFuture(lease.schedule_valid_until, nowMs)
    && isFuture(lease.lease_expires_at, nowMs);
}

export function filterPrayerPushTargets(
  targets: PushSubscriptionRecord[],
  leases: NativeAuthorityLease[] | null,
  now: Date,
) {
  if (!leases) return targets;
  const nowMs = now.getTime();
  const suppressed = new Set(
    leases
      .filter((lease) => lease.push_subscription_id && leaseIsHealthy(lease, nowMs))
      .map((lease) => lease.push_subscription_id as string),
  );
  if (suppressed.size === 0) return targets;
  return targets.filter((target) => !suppressed.has(target.id));
}
