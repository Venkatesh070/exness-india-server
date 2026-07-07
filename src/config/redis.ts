// In-memory cache — Redis can be wired in later via REDIS_URL when needed.

const memoryStore = new Map<string, { value: string; expiresAt: number }>();

export function getRedis(): null {
  return null;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheGet(key: string): Promise<string | null> {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheDel(key: string): Promise<void> {
  memoryStore.delete(key);
}
