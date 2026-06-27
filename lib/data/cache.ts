const cache = new Map<string, { data: unknown; expiry: number }>();
const DEFAULT_TTL_MS = 30_000; // 30 seconds

export function getCached<T>(key: string, loader: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return Promise.resolve(entry.data as T);
  }
  return loader().then((data) => {
    cache.set(key, { data, expiry: Date.now() + ttlMs });
    return data;
  });
}

export function setCached<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
