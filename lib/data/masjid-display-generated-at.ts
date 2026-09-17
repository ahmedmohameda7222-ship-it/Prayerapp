import "server-only";

import { createServerClient } from "@/lib/supabase/server";

export type MasjidDisplayGeneratedAtSources = {
  prayerIds: string[];
  jumuahIds: string[];
  announcementIds: string[];
  eventIds: string[];
  campaignIds: string[];
};

type TimestampTable =
  | "prayer_times"
  | "prayer_settings"
  | "jumuah_times"
  | "announcements"
  | "events"
  | "donation_campaigns"
  | "mosque_settings"
  | "masjid_display_settings";

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))];
}

function normalizeTimestamp(value: unknown, table: TimestampTable) {
  const parsed = Date.parse(String(value ?? ""));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid Masjid Display source timestamp: ${table}`);
  }
  return new Date(parsed).toISOString();
}

export async function getMasjidDisplayGeneratedAt(
  sources: MasjidDisplayGeneratedAtSources,
  fallbackIso: string,
): Promise<string> {
  const fallback = normalizeTimestamp(fallbackIso, "prayer_times");
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");

  async function load(table: TimestampTable, ids: string[]) {
    const representedIds = uniqueIds(ids);
    if (representedIds.length === 0) return [] as string[];

    const { data, error } = await client
      .from(table)
      .select("updated_at")
      .in("id", representedIds);

    if (error) {
      throw new Error(`Unable to load Masjid Display source timestamps: ${table}`);
    }

    return (data ?? []).map((row) => normalizeTimestamp(row.updated_at, table));
  }

  const timestamps = (
    await Promise.all([
      load("prayer_times", sources.prayerIds),
      load("prayer_settings", ["1"]),
      load("jumuah_times", sources.jumuahIds),
      load("announcements", sources.announcementIds),
      load("events", sources.eventIds),
      load("donation_campaigns", sources.campaignIds),
      load("mosque_settings", ["1"]),
      load("masjid_display_settings", ["1"]),
    ])
  ).flat();

  if (timestamps.length === 0) return fallback;

  return timestamps.slice(1).reduce(
    (latest, timestamp) => Date.parse(timestamp) > Date.parse(latest) ? timestamp : latest,
    timestamps[0],
  );
}
