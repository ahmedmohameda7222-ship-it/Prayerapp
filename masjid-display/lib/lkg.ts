import type { MasjidDisplayFeedV1 } from "./feed-types";
import { validateFeedV1 } from "./validate-feed";

const STORAGE_KEY = "masjid-display-lkg-v1";

export interface StoredLkg {
  snapshot: MasjidDisplayFeedV1;
  etag: string | null;
  receivedAt: string;
  schemaVersion: 1;
}

let memoryLkg: StoredLkg | null = null;
let memoryOnly = false;

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function validateReceivedAt(value: unknown): string {
  if (typeof value !== "string" || !value || !Number.isFinite(Date.parse(value))) {
    throw new Error("receivedAt must be a valid timestamp");
  }
  return value;
}

function parseStored(value: unknown): StoredLkg {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("LKG must be an object");
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = ["etag", "receivedAt", "schemaVersion", "snapshot"];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error("LKG envelope has unexpected fields");
  }
  if (record.schemaVersion !== 1) {
    throw new Error("LKG schemaVersion must be 1");
  }
  if (record.etag !== null && typeof record.etag !== "string") {
    throw new Error("LKG etag must be a string or null");
  }

  return {
    snapshot: validateFeedV1(record.snapshot),
    etag: record.etag as string | null,
    receivedAt: validateReceivedAt(record.receivedAt),
    schemaVersion: 1,
  };
}

export function loadLkg(): StoredLkg | null {
  if (memoryOnly && memoryLkg) {
    return memoryLkg;
  }

  const storage = browserStorage();
  if (!storage) {
    return memoryLkg;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return memoryLkg;
  }

  if (raw === null) {
    return memoryOnly ? memoryLkg : null;
  }

  try {
    const stored = parseStored(JSON.parse(raw));
    memoryLkg = stored;
    memoryOnly = false;
    return stored;
  } catch {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Invalid persisted data is ignored even if cleanup is unavailable.
    }
    memoryLkg = null;
    memoryOnly = false;
    return null;
  }
}

export function replaceLkg(snapshot: unknown, etag: string | null, receivedAt: string): void {
  if (etag !== null && typeof etag !== "string") {
    throw new Error("etag must be a string or null");
  }

  const next: StoredLkg = {
    snapshot: validateFeedV1(snapshot),
    etag,
    receivedAt: validateReceivedAt(receivedAt),
    schemaVersion: 1,
  };

  const storage = browserStorage();
  if (!storage) {
    memoryLkg = next;
    memoryOnly = true;
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    memoryLkg = next;
    memoryOnly = false;
  } catch {
    memoryLkg = next;
    memoryOnly = true;
  }
}
