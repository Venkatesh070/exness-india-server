import Redis from "ioredis";
import { env } from "./env.js";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });
    redis.connect().catch(() => {
      console.warn("Redis unavailable — using in-memory fallback");
      redis = null;
    });
  }
  return redis;
}

const memoryStore = new Map<string, { value: string; expiresAt: number }>();

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (client) {
    await client.setex(key, ttlSeconds, value);
    return;
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedis();
  if (client) return client.get(key);
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedis();
  if (client) {
    await client.del(key);
    return;
  }
  memoryStore.delete(key);
}
