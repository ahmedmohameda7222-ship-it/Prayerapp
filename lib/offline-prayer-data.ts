import type { PrayerIqamaDelays } from "@/lib/prayer-engine/types";
import type { PrayerTime } from "@/lib/types";

const CLOCK = /^(?:[01]\\d|2[0-3]):[0-5]\\d$/;
const DATE = /^\\d{4}-\\d{2}-\\d{2}$/;
const NAMES = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
const IQAMA_NAMES = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

export type OfflinePrayerDay = { date: string } & Record<(typeof NAMES)[number], string>;

export type PublicOfflinePrayerSchedule = {
  schemaVersion: 1;
  timezone: string;
  fetchedAt: string;
  iqamaDelays: PrayerIqamaDelays | null;
  rows: OfflinePrayerDay[];
};

function validDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validatedIqamaDelays(value: PrayerIqamaDelays | null): PrayerIqamaDelays | null {
  if (value === null) return null;
  if (!value || IQAMA_NAMES.some(name => !Number.isInteger(value[name]) || value[name] < 0 || value[name] > 180)) {
    throw new Error("Invalid public Iqama delays");
  }
  return Object.fromEntries(IQAMA_NAMES.map(name => [name, value[name]])) as PrayerIqamaDelays;
}

/**
 * Only canonical, published public times cross into offline Cache Storage.
 * No row IDs, admin metadata, auth state, or unpublished schedules.
 */
export function buildPublicOfflineSchedule({
  rows, timezone, iqamaDelays, fetchedAt,
}: {
  rows: PrayerTime[];
  timezone: string;
  iqamaDelays: PrayerIqamaDelays | null;
  fetchedAt: string;
}): PublicOfflinePrayerSchedule {
  if (typeof timezone !== "string" || timezone.length > 100) throw new Error("Invalid offline timezone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new Error("Invalid offline timezone");
  }
  if (!fetchedAt || !Number.isFinite(Date.parse(fetchedAt))) throw new Error("Invalid offline snapshot timestamp");
  if (!Array.isArray(rows) || rows.length > 400) throw new Error("Invalid offline schedule length");

  const publicRows: OfflinePrayerDay[] = [];
  let previousDate = "";
  for (const row of rows) {
    if (row.published !== true) continue;
    if (!validDate(row.date) || row.date <= previousDate ||
        NAMES.some(name => typeof row[name] !== "string" || !CLOCK.test(row[name]))) {
      throw new Error("Invalid published prayer row for offline cache");
    }
    const times = Object.fromEntries(NAMES.map(name => [name, row[name]])) as Record<(typeof NAMES)[number], string>;
    publicRows.push({ date: row.date, ...times });
    previousDate = row.date;
  }

  return {
    schemaVersion: 1,
    timezone,
    fetchedAt,
    iqamaDelays: validatedIqamaDelays(iqamaDelays),
    rows: publicRows,
  };
}


const DAY_MS = 24 * 60 * 60 * 1000;

/** The existing published-snapshot RPC accepts no more than 93 days per range. */
export function splitOfflinePrayerRange(
  today: string,
  daysAfter = 365,
): Array<{ from: string; through: string }> {
  if (!validDate(today) || !Number.isInteger(daysAfter) || daysAfter < 0 || daysAfter > 365) {
    throw new Error("Invalid offline prayer range");
  }

  const midnightUtc = Date.parse(today + "T00:00:00Z");
  const last = midnightUtc + daysAfter * DAY_MS;
  const result: Array<{ from: string; through: string }> = [];
  for (let first = midnightUtc - DAY_MS; first <= last; first += 90 * DAY_MS) {
    const through = Math.min(first + 89 * DAY_MS, last);
    result.push({
      from: new Date(first).toISOString().slice(0, 10),
      through: new Date(through).toISOString().slice(0, 10),
    });
  }
  return result;
}
