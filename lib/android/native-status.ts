import type { NativeBridgeStatus } from "@/lib/android/native-web";

export type NativeStatusKind = "ready" | "needs-system-access" | "unhealthy";

export function nativeStatusKind(status: NativeBridgeStatus | null): NativeStatusKind {
  if (status?.nativeReady) return "ready";
  if (!status
    || !status.notificationPermission
    || !status.notificationDeliveryEnabled
    || !status.reminderChannelEnabled
    || !status.adhanChannelEnabled
    || !status.exactAlarmPermission) {
    return "needs-system-access";
  }
  return "unhealthy";
}
