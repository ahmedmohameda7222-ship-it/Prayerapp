import type { MasjidDisplayFeedV1 } from "./feed-types";

export interface StoredLkg {
  snapshot: MasjidDisplayFeedV1;
  etag: string | null;
  receivedAt: string;
  schemaVersion: 1;
}

export function loadLkg(): StoredLkg | null {
  return null;
}

export function replaceLkg(
  _snapshot: unknown,
  _etag: string | null,
  _receivedAt: string,
): void {
  throw new Error("LKG storage not implemented");
}
