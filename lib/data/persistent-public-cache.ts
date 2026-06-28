interface PersistentEntry {
  data: unknown;
  savedAt: number;
  expiry: number;
  staleFallback: number;
}

const PREFIX = "pp_cache_";

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota errors
  }
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveToPersistentCache(
  key: string,
  data: unknown,
  ttlMs: number,
  staleFallbackMs: number,
): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const entry: PersistentEntry = {
    data: { value: data },
    savedAt: now,
    expiry: now + ttlMs,
    staleFallback: now + staleFallbackMs,
  };
  safeSet(`${PREFIX}${key}`, JSON.stringify(entry));
}

export function loadFromPersistentCache<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = safeGet(`${PREFIX}${key}`);
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as PersistentEntry;
    const now = Date.now();
    if (now <= entry.expiry) {
      const wrapper = entry.data as { value: T };
      return wrapper.value;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function loadFromPersistentCacheStale<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = safeGet(`${PREFIX}${key}`);
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as PersistentEntry;
    if (Date.now() <= entry.staleFallback) {
      const wrapper = entry.data as { value: T };
      return wrapper.value;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function clearPersistentCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    // ignore
  }
}

export function clearPersistentCachePrefix(prefix: string): void {
  if (typeof window === "undefined") return;
  try {
    const fullPrefix = `${PREFIX}${prefix}`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(fullPrefix)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}
