import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as nativeStatusModule from "@/lib/android/native-status";
import type { NativeBridgeStatus } from "@/lib/android/native-web";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

function baseStatus(overrides: Partial<NativeBridgeStatus> = {}): NativeBridgeStatus {
  return {
    native: true,
    packageId: "de.donaumoschee.app",
    versionCode: 5,
    versionName: "2.0.0",
    notificationPermission: true,
    notificationDeliveryEnabled: true,
    reminderChannelEnabled: true,
    adhanChannelEnabled: true,
    exactAlarmPermission: true,
    scheduleFresh: true,
    alarmScheduleInstalled: true,
    audioReady: true,
    engineHealthy: true,
    nativeReady: true,
    ...overrides,
  };
}

describe("Android permission diagnostics", () => {
  it("diagnoses runtime permission and app notification delivery independently", () => {
    const diagnostics = (nativeStatusModule as Record<string, unknown>).nativePermissionDiagnostics;
    expect(typeof diagnostics).toBe("function");
    const evaluate = diagnostics as (status: NativeBridgeStatus) => Array<{ key: string; ok: boolean; advisory?: boolean }>;

    const runtimeDenied = evaluate(baseStatus({
      notificationPermission: false,
      notificationDeliveryEnabled: false,
      appNotificationsEnabled: true,
      nativeReady: false,
    }));
    expect(runtimeDenied.find((item) => item.key === "notification-permission")?.ok).toBe(false);
    expect(runtimeDenied.find((item) => item.key === "app-notifications")?.ok).toBe(true);

    const appDisabled = evaluate(baseStatus({
      notificationPermission: true,
      notificationDeliveryEnabled: false,
      appNotificationsEnabled: false,
      nativeReady: false,
    }));
    expect(appDisabled.find((item) => item.key === "notification-permission")?.ok).toBe(true);
    expect(appDisabled.find((item) => item.key === "app-notifications")?.ok).toBe(false);
  });

  it("reports reminder channel, Adhan channel, and exact alarm as distinct checks", () => {
    const diagnostics = (nativeStatusModule as Record<string, unknown>).nativePermissionDiagnostics as
      | ((status: NativeBridgeStatus) => Array<{ key: string; ok: boolean }>)
      | undefined;
    expect(typeof diagnostics).toBe("function");
    const result = diagnostics!(baseStatus({
      reminderChannelEnabled: false,
      adhanChannelEnabled: false,
      exactAlarmPermission: false,
      nativeReady: false,
    }));

    expect(result.find((item) => item.key === "reminder-channel")?.ok).toBe(false);
    expect(result.find((item) => item.key === "adhan-channel")?.ok).toBe(false);
    expect(result.find((item) => item.key === "exact-alarm")?.ok).toBe(false);
  });

  it("includes battery optimization only when Android reports it as relevant and keeps it advisory", () => {
    const diagnostics = (nativeStatusModule as Record<string, unknown>).nativePermissionDiagnostics as
      | ((status: NativeBridgeStatus) => Array<{ key: string; ok: boolean; advisory?: boolean }>)
      | undefined;
    expect(typeof diagnostics).toBe("function");

    const relevant = diagnostics!(baseStatus({
      batteryOptimizationRelevant: true,
      batteryOptimizationExempt: false,
    }));
    expect(relevant.find((item) => item.key === "battery-optimization")).toMatchObject({
      ok: false,
      advisory: true,
    });

    const irrelevant = diagnostics!(baseStatus({
      batteryOptimizationRelevant: false,
      batteryOptimizationExempt: true,
    }));
    expect(irrelevant.some((item) => item.key === "battery-optimization")).toBe(false);
  });

  it("renders the independent native checks instead of only one collapsed permission sentence", () => {
    const settings = source("components/settings/SettingsControls.tsx");
    expect(settings).toContain("nativePermissionDiagnostics");
    expect(settings).toContain("notification-permission");
    expect(settings).toContain("app-notifications");
    expect(settings).toContain("reminder-channel");
    expect(settings).toContain("adhan-channel");
    expect(settings).toContain("exact-alarm");
    expect(settings).toContain("battery-optimization");
  });
});
