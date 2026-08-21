import { describe, expect, it } from "vitest";
import {
  parseNativeHeartbeat,
  parseScheduleRequest,
} from "@/lib/android/contracts";
import { parseNativeMessage } from "@/lib/android/native-web";

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
      exactAlarmPermission: true,
      scheduleFresh: true,
      alarmScheduleInstalled: true,
      audioReady: true,
      engineHealthy: true,
      scheduleValidUntil: "2026-08-25T00:00:00.000Z",
    }, new Date("2026-08-22T08:00:00.000Z"));
    expect(parsed?.nativeReady).toBe(true);
  });

  it("never treats an invalid or stale schedule report as ready", () => {
    expect(parseNativeHeartbeat({
      notificationPermission: true,
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
});
