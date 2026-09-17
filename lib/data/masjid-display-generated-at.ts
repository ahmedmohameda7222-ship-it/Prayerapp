import "server-only";

import { createServerClient } from "@/lib/supabase/server";

export type MasjidDisplayGeneratedAtSources = {
  prayerIds: string[];
  jumuahIds: string[];
  announcementIds: string[];
  eventIds: string[];
  campaignIds: string[];
  azkarRevisionTimestamps: string[];
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

type ServerClient = NonNullable<ReturnType<typeof createServerClient>>;

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))];
}

function normalizeTimestamp(value: unknown, source: TimestampTable | "hardcoded_azkar") {
  const parsed = Date.parse(String(value ?? ""));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid Masjid Display source timestamp: ${source}`);
  }
  return new Date(parsed).toISOString();
}

async function loadSourceTimestamps(
  client: ServerClient,
  table: TimestampTable,
  ids: string[],
) {
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

export async function getMasjidDisplayGeneratedAt(
  sources: MasjidDisplayGeneratedAtSources,
  fallbackIso: string,
): Promise<string> {
  const fallback = normalizeTimestamp(fallbackIso, "prayer_times");
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");

  const databaseTimestamps = (
    await Promise.all([
      loadSourceTimestamps(client, "prayer_times", sources.prayerIds),
      loadSourceTimestamps(client, "prayer_settings", ["1"]),
      loadSourceTimestamps(client, "jumuah_times", sources.jumuahIds),
      loadSourceTimestamps(client, "announcements", sources.announcementIds),
      loadSourceTimestamps(client, "events", sources.eventIds),
      loadSourceTimestamps(client, "donation_campaigns", sources.campaignIds),
      loadSourceTimestamps(client, "mosque_settings", ["1"]),
      loadSourceTimestamps(client, "masjid_display_settings", ["1"]),
    ])
  ).flat();

  const azkarTimestamps = sources.azkarRevisionTimestamps.map((timestamp) =>
    normalizeTimestamp(timestamp, "hardcoded_azkar")
  );
  const timestamps = [...databaseTimestamps, ...azkarTimestamps];

  if (timestamps.length === 0) return fallback;

  return timestamps.slice(1).reduce(
    (latest, timestamp) => Date.parse(timestamp) > Date.parse(latest) ? timestamp : latest,
    timestamps[0],
  );
}
