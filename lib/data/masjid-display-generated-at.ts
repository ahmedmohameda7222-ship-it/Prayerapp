import "server-only";

import { createHash } from "node:crypto";
import type { DisplayAzkarDto } from "@/lib/masjid-display/feed-contract";

export type MasjidDisplayGeneratedAtSources = {
  sourceTimestamps: string[];
  azkar: DisplayAzkarDto[];
  prayerIds?: string[];
  jumuahIds?: string[];
  announcementIds?: string[];
  eventIds?: string[];
  campaignIds?: string[];
};

const MAX_LOGICAL_ISO_MS = Date.parse("9999-12-31T23:59:59.999Z");

function normalizeTimestamp(value: unknown, source: "database_source" | "fallback") {
  const parsed = Date.parse(String(value ?? ""));
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid Masjid Display source timestamp: " + source);
  }
  return new Date(parsed).toISOString();
}

function representedAzkarRevision(azkar: DisplayAzkarDto[]): string {
  // Tuple form is deliberately canonical: it contains exactly the fields emitted
  // by Feed v1, in feed order, without object-key-order dependence.
  const representedContent = azkar.map((item) => [
    item.id,
    item.category,
    item.arabicText,
    item.translationDe,
    item.source,
    item.repeatCount,
    item.sortOrder,
  ]);

  return createHash("sha256")
    .update(JSON.stringify(representedContent))
    .digest("hex");
}

/**
 * Feed v1 keeps generatedAt ISO-parseable for the established contract, but
 * represented hardcoded Azkar have no truthful wall-clock updated_at value.
 *
 * Therefore, when Azkar are represented, generatedAt is a deterministic logical
 * source-version timestamp, not a claim about request/build/deploy time:
 *   1. the latest captured database source timestamp is the real-time anchor;
 *   2. SHA-256 of the actual represented Azkar DTO content is the version basis;
 *   3. SHA-256 of {anchor, Azkar revision} is mapped into the remaining valid
 *      ISO-millisecond domain strictly after the anchor (through year 9999).
 *
 * This makes unchanged represented content stable, makes represented Azkar
 * changes alter the version, and excludes unrelated/unselected catalog content.
 * Consumers must use the HTTP Date header for current server time/freshness.
 * snapshotRevision and the strong ETag remain the full SHA-256 content identity.
 */
function withRepresentedAzkarVersion(baseIso: string, azkar: DisplayAzkarDto[]): string {
  if (azkar.length === 0) return baseIso;

  const baseMs = Date.parse(baseIso);
  const availableLogicalMilliseconds = MAX_LOGICAL_ISO_MS - baseMs;
  if (!Number.isSafeInteger(availableLogicalMilliseconds) || availableLogicalMilliseconds <= 0) {
    throw new Error("Masjid Display generatedAt has no remaining logical ISO version space");
  }

  const azkarRevision = representedAzkarRevision(azkar);
  const versionBasis = createHash("sha256")
    .update(baseIso + "\n" + azkarRevision)
    .digest("hex");
  const logicalOffset =
    Number(BigInt("0x" + versionBasis) % BigInt(availableLogicalMilliseconds)) + 1;

  return new Date(baseMs + logicalOffset).toISOString();
}

export async function getMasjidDisplayGeneratedAt(
  sources: MasjidDisplayGeneratedAtSources,
  fallbackIso: string,
): Promise<string> {
  const fallback = normalizeTimestamp(fallbackIso, "fallback");
  const sourceTimestamps = sources.sourceTimestamps.map((timestamp) =>
    normalizeTimestamp(timestamp, "database_source")
  );

  const baseGeneratedAt = sourceTimestamps.length === 0
    ? fallback
    : sourceTimestamps.slice(1).reduce(
      (latest, timestamp) => Date.parse(timestamp) > Date.parse(latest) ? timestamp : latest,
      sourceTimestamps[0],
    );

  return withRepresentedAzkarVersion(baseGeneratedAt, sources.azkar);
}
