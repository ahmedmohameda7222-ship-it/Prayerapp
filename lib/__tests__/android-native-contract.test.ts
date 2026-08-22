import { describe, expect, it } from "vitest";
import {
  parseNativeHeartbeat,
  parseScheduleRequest,
} from "@/lib/android/contracts";
import {
  isNativeAuthorityId,
  parseNativeMessage,
  supportsNativeAuthorityGeneration,
} from "@/lib/android/native-web";
import { nativeStatusKind } from "@/lib/android/native-status";
import { isAuthorityId } from "@/lib/android/native-credentials";

describe("Android server contracts", () => {
  it("bounds published schedule requests", () => {
    expect(parseScheduleRequest(new URL("https://example.test/api?from=2026-08-22&days=31"))).toEqual({
      from: "2026-08-22",
      days: 31,
      through: "2026-09-21",
    });
    expect(parseScheduleRequest(new URL("https://example.test/api?from=22-08-2026&days=31"))).toBeNull();
    expect(parseScheduleRequest(new URL("https://example.test/api?from=2026-08-22&days=32"))).toBeNull();
  });

  it("grants readiness only for a complete healthy native engine report", () => {
    const parsed = parseNativeHeartbeat({
      notificationPermission: true,
      notificationDeliveryEnabled: true,
      reminderChannelEnabled: true,
      adhanChannelEnabled: true,
      exactAlarmPermission: true,
      scheduleFresh: true,
      alarmScheduleInstalled: true,
      audioReady: true,
      engineHealthy: true,
      scheduleValidUntil: "2026-08-25T00:00:00.000Z",
    }, new Date("2026-08-22T08:00:00.000Z"));
    expect(parsed?.nativeReady).toBe(true);
  });

  it.each([
    "notificationPermission",
    "notificationDeliveryEnabled",
    "reminderChannelEnabled",
    "adhanChannelEnabled",
  ] as const)("revokes readiness when %s is false", (field) => {
    const heartbeat = {
      notificationPermission: true,
      notificationDeliveryEnabled: true,
      reminderChannelEnabled: true,
      adhanChannelEnabled: true,
      exactAlarmPermission: true,
      scheduleFresh: true,
      alarmScheduleInstalled: true,
      audioReady: true,
      engineHealthy: true,
      scheduleValidUntil: "2026-08-25T00:00:00.000Z",
      [field]: false,
    };
    expect(parseNativeHeartbeat(heartbeat, new Date("2026-08-22T08:00:00.000Z"))?.nativeReady).toBe(false);
  });

  it("never treats an invalid or stale schedule report as ready", () => {
    expect(parseNativeHeartbeat({
      notificationPermission: true,
      notificationDeliveryEnabled: true,
      reminderChannelEnabled: true,
      adhanChannelEnabled: true,
      exactAlarmPermission: true,
      scheduleFresh: true,
      alarmScheduleInstalled: true,
      audioReady: true,
      engineHealthy: true,
      scheduleValidUntil: "2026-08-22T07:59:59.000Z",
    }, new Date("2026-08-22T08:00:00.000Z"))?.nativeReady).toBe(false);
    expect(parseNativeHeartbeat({ scheduleValidUntil: "not-a-date" }, new Date())).toBeNull();
  });

  it("accepts only versioned native messages with object payloads", () => {
    expect(parseNativeMessage('{"version":1,"type":"native.ready","payload":{"native":true}}')?.type).toBe("native.ready");
    expect(parseNativeMessage('{"version":2,"type":"native.ready","payload":{}}')).toBeNull();
    expect(parseNativeMessage('{"version":1,"type":"web.configure","payload":{}}')).toBeNull();
    expect(parseNativeMessage('{"version":1,"type":"native.ready","payload":[]}')).toBeNull();
  });

  it("accepts only canonical UUID authority generations", () => {
    expect(isAuthorityId("8e5f7ac6-7a84-4d3e-946a-e4f91be50a7c")).toBe(true);
    expect(isAuthorityId("not-an-authority")).toBe(false);
    expect(isAuthorityId(undefined)).toBe(false);
    expect(isNativeAuthorityId("8e5f7ac6-7a84-4d3e-946a-e4f91be50a7c")).toBe(true);
    expect(isNativeAuthorityId("not-an-authority")).toBe(false);
  });

  it("does not enroll legacy native builds that lack generation binding", () => {
    const status = {
      native: true as const,
      packageId: "de.donaumoschee.app",
      versionCode: 4,
      versionName: "1.0.1",
      notificationPermission: true,
      notificationDeliveryEnabled: true,
      reminderChannelEnabled: true,
      adhanChannelEnabled: true,
      exactAlarmPermission: true,
      scheduleFresh: false,
      alarmScheduleInstalled: false,
      audioReady: true,
      engineHealthy: false,
      nativeReady: false,
    };
    expect(supportsNativeAuthorityGeneration(status)).toBe(false);
    expect(supportsNativeAuthorityGeneration({
      ...status,
      capabilities: ["authority-generation-v1"],
    })).toBe(true);
  });

  it("classifies disabled notification delivery as system access required", () => {
    const status = {
      native: true as const,
      packageId: "de.donaumoschee.app",
      versionCode: 4,
      versionName: "1.0.1",
      notificationPermission: true,
      notificationDeliveryEnabled: false,
      reminderChannelEnabled: true,
      adhanChannelEnabled: true,
      exactAlarmPermission: true,
      scheduleFresh: true,
      alarmScheduleInstalled: true,
      audioReady: true,
      engineHealthy: true,
      nativeReady: false,
    };
    expect(nativeStatusKind(status)).toBe("needs-system-access");
    expect(nativeStatusKind({ ...status, notificationDeliveryEnabled: true, reminderChannelEnabled: false }))
      .toBe("needs-system-access");
    expect(nativeStatusKind({ ...status, notificationDeliveryEnabled: true, adhanChannelEnabled: false }))
      .toBe("needs-system-access");
    expect(nativeStatusKind({ ...status, notificationDeliveryEnabled: true, nativeReady: true }))
      .toBe("ready");
  });
});
