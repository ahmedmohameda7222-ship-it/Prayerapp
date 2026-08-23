import { describe, expect, it } from "vitest";
import { prayerEventId } from "@/lib/android/prayer-event-id";
import * as authority from "@/lib/android/native-authority";
import type { NativeAuthorityLease } from "@/lib/android/native-authority";

function healthyLease(overrides: Partial<NativeAuthorityLease> = {}): NativeAuthorityLease {
  return {
    installation_id: "123e4567-e89b-12d3-a456-426614174001",
    push_subscription_id: "push-a",
    receipt_v2: true,
    account_generation: 4,
    native_ready: true,
    notification_permission: true,
    notification_delivery_enabled: true,
    reminder_channel_enabled: true,
    adhan_channel_enabled: true,
    exact_alarm_permission: true,
    schedule_fresh: true,
    alarm_schedule_installed: true,
    audio_ready: true,
    engine_healthy: true,
    schedule_valid_until: "2026-08-24T12:00:00.000Z",
    lease_expires_at: "2026-08-24T12:00:00.000Z",
    ...overrides,
  };
}

describe("Android server delivery v2 behavior", () => {
  it("generates a stable full SHA-256 canonical event ID", () => {
    expect(prayerEventId({
      scheduleId: "123e4567-e89b-12d3-a456-426614174000",
      scheduleRevision: "2026-08-23T10:00:00.000Z",
      date: "2026-08-23",
      prayer: "fajr",
      kind: "reminder",
      leadMinutes: 15,
    })).toBe("p2:6fa4dff45f7b483f0357290c2dc6687d3be77997649150b2d2840813351237ce");
  });

  it("changes the canonical event ID when delivery identity changes", () => {
    const common = {
      scheduleId: "123e4567-e89b-12d3-a456-426614174000",
      scheduleRevision: "2026-08-23T10:00:00.000Z",
      date: "2026-08-23",
      prayer: "fajr",
    } as const;
    const reminder = prayerEventId({ ...common, kind: "reminder", leadMinutes: 15 });
    const adhan = prayerEventId({ ...common, kind: "adhan", leadMinutes: 0 });
    expect(adhan).not.toBe(reminder);
  });

  it("does not make reminder readiness depend on Adhan channel or audio", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    expect(authority.nativeDeliveryCapability(
      healthyLease({ adhan_channel_enabled: false, audio_ready: false }),
      "reminder",
      now,
    )).toBe(true);
  });

  it("requires Adhan channel and audio for Adhan readiness", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    expect(authority.nativeDeliveryCapability(
      healthyLease({ adhan_channel_enabled: false, audio_ready: false }),
      "adhan",
      now,
    )).toBe(false);
  });

  it("plans receipt-aware fallback and fails open", () => {
    const planner = (authority as unknown as Record<string, unknown>).nativeFallbackDecision;
    expect(typeof planner).toBe("function");
    if (typeof planner !== "function") return;

    const decide = planner as (input: Record<string, unknown>) => string;
    const dueAtMs = Date.parse("2026-08-23T12:00:00.000Z");
    const lease = healthyLease();

    expect(decide({
      targetId: "push-a",
      lease,
      kind: "reminder",
      now: new Date("2026-08-23T12:00:30.000Z"),
      dueAtMs,
      receiptInstallationIds: new Set<string>(),
      receiptLookupFailed: false,
    })).toBe("wait");

    expect(decide({
      targetId: "push-a",
      lease,
      kind: "reminder",
      now: new Date("2026-08-23T12:01:05.000Z"),
      dueAtMs,
      receiptInstallationIds: new Set([lease.installation_id as string]),
      receiptLookupFailed: false,
    })).toBe("suppress");

    expect(decide({
      targetId: "push-a",
      lease,
      kind: "reminder",
      now: new Date("2026-08-23T12:01:05.000Z"),
      dueAtMs,
      receiptInstallationIds: new Set<string>(),
      receiptLookupFailed: false,
    })).toBe("push");

    expect(decide({
      targetId: "push-a",
      lease,
      kind: "reminder",
      now: new Date("2026-08-23T12:01:05.000Z"),
      dueAtMs,
      receiptInstallationIds: new Set([lease.installation_id as string]),
      receiptLookupFailed: true,
    })).toBe("push");

    expect(decide({
      targetId: "push-a",
      lease: healthyLease({ receipt_v2: false }),
      kind: "reminder",
      now: new Date("2026-08-23T12:00:10.000Z"),
      dueAtMs,
      receiptInstallationIds: new Set<string>(),
      receiptLookupFailed: false,
    })).toBe("push");
  });
});
