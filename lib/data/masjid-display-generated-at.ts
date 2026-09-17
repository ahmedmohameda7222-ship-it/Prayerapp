import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import type { DisplayAzkarDto } from "@/lib/masjid-display/feed-contract";
import { canonicalJson, sha256 } from "@/lib/masjid-display/feed-etag";

export type MasjidDisplayGeneratedAtSources = {
  prayerIds: string[];
  jumuahIds: string[];
  announcementIds: string[];
  eventIds: string[];
  campaignIds: string[];
  azkar: DisplayAzkarDto[];
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

const SHA256_DECIMAL_WIDTH = 78;

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

/**
 * Keep generatedAt anchored to the latest represented database source second while
 * encoding the complete SHA-256 revision of that source timestamp plus the actual
 * represented Azkar DTOs in the ISO fractional-second component. The long decimal
 * fraction is deterministic version metadata, not wall-clock precision.
 *
 * This preserves an ISO/RFC3339 timestamp without request/build/deploy entropy:
 * unchanged represented Azkar is byte-stable, selected Azkar changes alter the
 * value, and catalog items omitted from this snapshot have no effect.
 */
export function withAzkarContentRevision(baseIso: string, azkar: DisplayAzkarDto[]): string {
  const parsed = Date.parse(baseIso);
  if (!Number.isFinite(parsed)) throw new Error("Invalid Masjid Display generatedAt base timestamp");

  const base = new Date(parsed).toISOString();
  if (azkar.length === 0) return base;

  const digest = sha256(canonicalJson({ base, azkar }));
  const decimalRevision = BigInt(`0x${digest}`).toString(10).padStart(SHA256_DECIMAL_WIDTH, "0");
  return `${base.slice(0, 19)}.${decimalRevision}Z`;
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

  const timestamps = (
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

  const baseGeneratedAt = timestamps.length === 0
    ? fallback
    : timestamps.slice(1).reduce(
      (latest, timestamp) => Date.parse(timestamp) > Date.parse(latest) ? timestamp : latest,
      timestamps[0],
    );

  return withAzkarContentRevision(baseGeneratedAt, sources.azkar);
}
