import type { AdhanPrayer, AdhanSoundId } from "@/lib/adhan-audio";

export const NATIVE_PRAYER_CONFIG_KEY = "danube-native-prayer-config-v1";
export const NATIVE_CONFIG_CHANGED_EVENT = "danube-native-prayer-config-changed";
const nativeAuthorityIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type NativeReminderPreference = {
  prayer: AdhanPrayer;
  enabled: boolean;
  leadMinutes: 0 | 5 | 10 | 15;
  adhanSoundId: AdhanSoundId;
};

export type StoredNativePreferences = {
  updatedAt: string;
  reminders: NativeReminderPreference[];
};

export type NativeBridgeStatus = {
  native: true;
  packageId: string;
  versionCode: number;
  versionName: string;
  notificationPermission: boolean;
  notificationDeliveryEnabled: boolean;
  reminderChannelEnabled: boolean;
  adhanChannelEnabled: boolean;
  exactAlarmPermission: boolean;
  scheduleFresh: boolean;
  alarmScheduleInstalled: boolean;
  audioReady: boolean;
  engineHealthy: boolean;
  nativeReady: boolean;
  scheduleValidUntil?: string;
  lastError?: string;
  installationId?: string;
  credential?: string;
  authorityId?: string;
  capabilities?: string[];
};

export type NativeMessage = {
  version: 1;
  type: string;
  payload: Record<string, unknown>;
};

export function isNativeAuthorityId(value: unknown): value is string {
  return typeof value === "string" && nativeAuthorityIdPattern.test(value);
}

export function supportsNativeAuthorityGeneration(status: NativeBridgeStatus | null) {
  return Array.isArray(status?.capabilities)
    && status.capabilities.includes("authority-generation-v1");
}

export function parseNativeMessage(value: unknown): NativeMessage | null {
  let parsed: unknown = value;
  if (typeof value === "string") {
    if (value.length === 0 || value.length > 65_536) return null;
    try { parsed = JSON.parse(value); } catch { return null; }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const message = parsed as Record<string, unknown>;
  if (message.version !== 1 || typeof message.type !== "string" || !/^native\.[a-z.]+$/u.test(message.type)) return null;
  if (!message.payload || typeof message.payload !== "object" || Array.isArray(message.payload)) return null;
  return message as NativeMessage;
}

export function publishNativePrayerPreferences(reminders: NativeReminderPreference[]) {
  const previous = readNativePrayerPreferences();
  const unchanged = previous && JSON.stringify(previous.reminders) === JSON.stringify(reminders);
  const value: StoredNativePreferences = {
    updatedAt: unchanged ? previous.updatedAt : new Date().toISOString(),
    reminders,
  };
  localStorage.setItem(NATIVE_PRAYER_CONFIG_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(NATIVE_CONFIG_CHANGED_EVENT));
}

export function readNativePrayerPreferences(): StoredNativePreferences | null {
  try {
    const value = JSON.parse(localStorage.getItem(NATIVE_PRAYER_CONFIG_KEY) || "null") as StoredNativePreferences | null;
    if (!value || !Array.isArray(value.reminders) || typeof value.updatedAt !== "string") return null;
    return value;
  } catch {
    return null;
  }
}
