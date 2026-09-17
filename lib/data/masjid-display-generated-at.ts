import "server-only";

export type MasjidDisplayGeneratedAtSources = {
  sourceTimestamps: string[];
  azkarRevisionTimestamps: string[];
  prayerIds?: string[];
  jumuahIds?: string[];
  announcementIds?: string[];
  eventIds?: string[];
  campaignIds?: string[];
};

function normalizeTimestamp(value: unknown, source: "database_source" | "hardcoded_azkar" | "fallback") {
  const parsed = Date.parse(String(value ?? ""));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid Masjid Display source timestamp: ${source}`);
  }
  return new Date(parsed).toISOString();
}

export async function getMasjidDisplayGeneratedAt(
  sources: MasjidDisplayGeneratedAtSources,
  fallbackIso: string,
): Promise<string> {
  const fallback = normalizeTimestamp(fallbackIso, "fallback");
  const sourceTimestamps = sources.sourceTimestamps.map((timestamp) =>
    normalizeTimestamp(timestamp, "database_source")
  );
  const azkarTimestamps = sources.azkarRevisionTimestamps.map((timestamp) =>
    normalizeTimestamp(timestamp, "hardcoded_azkar")
  );
  const timestamps = [...sourceTimestamps, ...azkarTimestamps];

  if (timestamps.length === 0) return fallback;

  return timestamps.slice(1).reduce(
    (latest, timestamp) => Date.parse(timestamp) > Date.parse(latest) ? timestamp : latest,
    timestamps[0],
  );
}
