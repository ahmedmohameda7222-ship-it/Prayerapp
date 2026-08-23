import type { PushSubscriptionRecord } from "@/lib/push/types";

export type NativeDeliveryKind = "reminder" | "adhan";
export type NativeFallbackDecision = "push" | "wait" | "suppress";

export const NATIVE_DELIVERY_GRACE_MS = 60 * 1000;

export type NativeAuthorityLease = {
  installation_id?: string;
  push_subscription_id: string | null;
  receipt_v2?: boolean;
  account_generation?: number;
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

function commonDeliveryCapability(lease: NativeAuthorityLease, nowMs: number) {
  return lease.native_ready
    && lease.notification_permission
    && lease.notification_delivery_enabled
    && lease.exact_alarm_permission
    && lease.schedule_fresh
    && lease.alarm_schedule_installed
    && lease.engine_healthy
    && isFuture(lease.schedule_valid_until, nowMs)
    && isFuture(lease.lease_expires_at, nowMs);
}

export function nativeDeliveryCapability(
  lease: NativeAuthorityLease,
  kind: NativeDeliveryKind,
  now: Date,
) {
  const nowMs = now.getTime();
  if (!commonDeliveryCapability(lease, nowMs)) return false;
  if (kind === "adhan") return lease.adhan_channel_enabled && lease.audio_ready;
  return lease.reminder_channel_enabled;
}

export function nativeFallbackDecision({
  targetId,
  lease,
  kind,
  now,
  dueAtMs,
  receiptInstallationIds,
  receiptLookupFailed,
}: {
  targetId: string;
  lease: NativeAuthorityLease | null | undefined;
  kind: NativeDeliveryKind;
  now: Date;
  dueAtMs: number;
  receiptInstallationIds: ReadonlySet<string>;
  receiptLookupFailed: boolean;
}): NativeFallbackDecision {
  if (
    !lease
    || lease.push_subscription_id !== targetId
    || lease.receipt_v2 !== true
    || !lease.installation_id
    || !nativeDeliveryCapability(lease, kind, now)
  ) {
    return "push";
  }

  if (now.getTime() - dueAtMs < NATIVE_DELIVERY_GRACE_MS) return "wait";
  if (receiptLookupFailed) return "push";
  return receiptInstallationIds.has(lease.installation_id) ? "suppress" : "push";
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

/**
 * Legacy v1 all-capability suppression. New server fallback must use the
 * event-specific nativeDeliveryCapability contract plus delivery receipts.
 */
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
