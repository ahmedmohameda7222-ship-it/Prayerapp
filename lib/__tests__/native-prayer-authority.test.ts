import { describe, expect, it } from "vitest";
import {
  filterPrayerPushTargets,
  type NativeAuthorityLease,
} from "@/lib/android/native-authority";
import type { PushSubscriptionRecord } from "@/lib/push/types";

const targets: PushSubscriptionRecord[] = [
  { id: "push-a", endpoint: "https://push.example/a", p256dh: "a", auth: "a", locale: "de", user_id: "user-a" },
  { id: "push-b", endpoint: "https://push.example/b", p256dh: "b", auth: "b", locale: "de", user_id: "user-a" },
];

const healthyLease = (overrides: Partial<NativeAuthorityLease> = {}): NativeAuthorityLease => ({
  push_subscription_id: "push-a",
  native_ready: true,
  notification_permission: true,
  exact_alarm_permission: true,
  schedule_fresh: true,
  alarm_schedule_installed: true,
  audio_ready: true,
  engine_healthy: true,
  schedule_valid_until: "2026-08-25T00:00:00.000Z",
  lease_expires_at: "2026-08-22T12:00:00.000Z",
  ...overrides,
});

describe("native prayer authority", () => {
  const now = new Date("2026-08-22T08:00:00.000Z");

  it("suppresses only the push subscription with a fresh fully healthy lease", () => {
    expect(filterPrayerPushTargets(targets, [healthyLease()], now).map((target) => target.id)).toEqual(["push-b"]);
  });

  it.each([
    ["expired lease", { lease_expires_at: "2026-08-22T07:59:59.000Z" }],
    ["revoked notification permission", { notification_permission: false }],
    ["revoked exact alarm permission", { exact_alarm_permission: false }],
    ["stale schedule flag", { schedule_fresh: false }],
    ["expired schedule", { schedule_valid_until: "2026-08-22T07:59:59.000Z" }],
    ["alarm install failure", { alarm_schedule_installed: false }],
    ["audio cache unavailable", { audio_ready: false }],
    ["unhealthy engine", { engine_healthy: false }],
    ["not ready", { native_ready: false }],
  ])("fails open for %s", (_label, overrides) => {
    expect(filterPrayerPushTargets(targets, [healthyLease(overrides)], now)).toEqual(targets);
  });

  it("fails open when lease lookup is unavailable", () => {
    expect(filterPrayerPushTargets(targets, null, now)).toEqual(targets);
  });
});
