import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import {
  hasCertifiedPrayerTimezoneRules,
  isCertifiedPrayerTimezone,
} from "@/lib/prayer-engine/certified-timezones";
import type { PrayerTime } from "@/lib/types";

type SnapshotOptions = {
  from?: string;
  through?: string;
  now?: Date;
  daysBefore?: number;
  daysAfter?: number;
};

export type PublishedPrayerScheduleSnapshot = {
  timezone: string;
  from: string;
  through: string;
  rows: PrayerTime[];
};

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid prayer schedule snapshot ${label}`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`Invalid prayer schedule snapshot ${label}`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function mapPrayerRow(value: unknown): PrayerTime {
  const row = asRecord(value, "row");
  return {
    id: requiredString(row.id, "row id"),
    date: requiredString(row.date, "row date"),
    fajr: requiredString(row.fajr, "fajr"),
    sunrise: requiredString(row.sunrise, "sunrise"),
    dhuhr: requiredString(row.dhuhr, "dhuhr"),
    asr: requiredString(row.asr, "asr"),
    maghrib: requiredString(row.maghrib, "maghrib"),
    isha: requiredString(row.isha, "isha"),
    maghribProgram: row.maghrib_program_enabled
      ? {
          enabled: true,
          lessonTitle: optionalString(row.maghrib_lesson_title),
          lessonDurationMinutes:
            typeof row.maghrib_lesson_duration_minutes === "number"
              ? row.maghrib_lesson_duration_minutes
              : undefined,
          combinedIshaTime: optionalString(row.maghrib_combined_isha_time),
        }
      : undefined,
    note: optionalString(row.note),
    noteAr: optionalString(row.note_ar),
    noteEn: optionalString(row.note_en),
    noteDe: optionalString(row.note_de),
    noteTr: optionalString(row.note_tr),
    published: true,
    updatedAt: requiredString(row.updated_at, "updated_at"),
  };
}

function assertTimezone(value: unknown): string {
  const timezone = requiredString(value, "timezone");
  if (!isCertifiedPrayerTimezone(timezone) || !hasCertifiedPrayerTimezoneRules(timezone)) {
    throw new Error("Invalid prayer schedule snapshot timezone");
  }
  return timezone;
}

export async function getPublishedPrayerScheduleSnapshot(
  options: SnapshotOptions,
): Promise<PublishedPrayerScheduleSnapshot> {
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");

  const { data, error } = await client.rpc("get_published_prayer_schedule_snapshot", {
    p_from: options.from ?? null,
    p_through: options.through ?? null,
    p_now: options.now?.toISOString() ?? null,
    p_days_before: options.daysBefore ?? 0,
    p_days_after: options.daysAfter ?? 0,
  });

  if (error) throw new Error("Unable to load atomic prayer schedule snapshot");
  const payload = asRecord(data, "payload");
  if (!Array.isArray(payload.rows)) {
    throw new Error("Invalid prayer schedule snapshot rows");
  }

  return {
    timezone: assertTimezone(payload.timeZone),
    from: requiredString(payload.from, "from"),
    through: requiredString(payload.through, "through"),
    rows: payload.rows.map(mapPrayerRow),
  };
}
