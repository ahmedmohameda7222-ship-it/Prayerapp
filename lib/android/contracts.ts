import { addDaysIso } from "@/lib/date-utils";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

export type ScheduleRequest = {
  from: string;
  days: number;
  through: string;
};

export type NativeHeartbeat = {
  notificationPermission: boolean;
  exactAlarmPermission: boolean;
  scheduleFresh: boolean;
  alarmScheduleInstalled: boolean;
  audioReady: boolean;
  engineHealthy: boolean;
  scheduleValidUntil: string;
  nativeReady: boolean;
};

function isRealIsoDate(value: string) {
  if (!isoDatePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseScheduleRequest(url: URL): ScheduleRequest | null {
  const from = url.searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const rawDays = url.searchParams.get("days") || "31";
  if (!isRealIsoDate(from) || !/^\d{1,2}$/u.test(rawDays)) return null;
  const days = Number(rawDays);
  if (!Number.isInteger(days) || days < 1 || days > 31) return null;
  return { from, days, through: addDaysIso(from, days - 1) };
}

export function parseNativeHeartbeat(value: unknown, now: Date): NativeHeartbeat | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const fields = [
    "notificationPermission",
    "exactAlarmPermission",
    "scheduleFresh",
    "alarmScheduleInstalled",
    "audioReady",
    "engineHealthy",
  ] as const;
  if (fields.some((field) => typeof body[field] !== "boolean")) return null;
  if (typeof body.scheduleValidUntil !== "string" || body.scheduleValidUntil.length > 64) return null;
  const validUntilMs = Date.parse(body.scheduleValidUntil);
  if (!Number.isFinite(validUntilMs)) return null;
  const nativeReady = fields.every((field) => body[field] === true) && validUntilMs > now.getTime();
  return {
    notificationPermission: body.notificationPermission as boolean,
    exactAlarmPermission: body.exactAlarmPermission as boolean,
    scheduleFresh: body.scheduleFresh as boolean,
    alarmScheduleInstalled: body.alarmScheduleInstalled as boolean,
    audioReady: body.audioReady as boolean,
    engineHealthy: body.engineHealthy as boolean,
    scheduleValidUntil: new Date(validUntilMs).toISOString(),
    nativeReady,
  };
}
