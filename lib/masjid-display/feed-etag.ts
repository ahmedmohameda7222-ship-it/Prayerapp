import { createHash } from "node:crypto";
import type { MasjidDisplayFeedBodyV1, MasjidDisplayFeedV1 } from "./feed-contract";
import { validateMasjidDisplayFeed } from "./validate-feed";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function finalizeFeed(body: MasjidDisplayFeedBodyV1): MasjidDisplayFeedV1 {
  const snapshotRevision = sha256(canonicalJson(body));
  return validateMasjidDisplayFeed({ ...body, snapshotRevision });
}

export function etagForFeed(feed: MasjidDisplayFeedV1): string {
  return `"${sha256(canonicalJson(feed))}"`;
}
