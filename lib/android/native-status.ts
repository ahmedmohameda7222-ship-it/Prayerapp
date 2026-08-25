import type { NativeBridgeStatus } from "@/lib/android/native-web";

export type NativeStatusKind = "ready" | "needs-system-access" | "unhealthy";

export type NativePermissionDiagnosticKey =
  | "notification-permission"
  | "app-notifications"
  | "reminder-channel"
  | "adhan-channel"
  | "exact-alarm"
  | "battery-optimization";

export type NativePermissionDiagnostic = {
  key: NativePermissionDiagnosticKey;
  ok: boolean;
  advisory?: boolean;
};

export function nativePermissionDiagnostics(status: NativeBridgeStatus): NativePermissionDiagnostic[] {
  const appNotificationsEnabled = typeof status.appNotificationsEnabled === "boolean"
    ? status.appNotificationsEnabled
    : status.notificationPermission
      ? status.notificationDeliveryEnabled
      : true;

  const diagnostics: NativePermissionDiagnostic[] = [
    { key: "notification-permission", ok: status.notificationPermission },
    { key: "app-notifications", ok: appNotificationsEnabled },
    { key: "reminder-channel", ok: status.reminderChannelEnabled },
    { key: "adhan-channel", ok: status.adhanChannelEnabled },
    { key: "exact-alarm", ok: status.exactAlarmPermission },
  ];

  if (status.batteryOptimizationRelevant === true) {
    diagnostics.push({
      key: "battery-optimization",
      ok: status.batteryOptimizationExempt === true,
      advisory: true,
    });
  }

  return diagnostics;
}

export function nativeStatusKind(status: NativeBridgeStatus | null): NativeStatusKind {
  if (status?.nativeReady) return "ready";
  if (!status) return "needs-system-access";
  if (nativePermissionDiagnostics(status).some((diagnostic) => !diagnostic.advisory && !diagnostic.ok)) {
    return "needs-system-access";
  }
  return "unhealthy";
}
