import { redisClient, KEY_PREFIX } from '../config/redis.js';

// ─────────────────────────────────────────────────────────────
//  In-Memory Fallback Cache (used when Redis is unavailable)
// ─────────────────────────────────────────────────────────────
class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  public set(key: string, data: any, ttlMs: number = 300_000): void {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  public async invalidate(prefix: string): Promise<void> {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  public async clear(): Promise<void> {
    this.cache.clear();
  }
}

// ─────────────────────────────────────────────────────────────
//  Redis-Backed Cache with MemoryCache fallback
// ─────────────────────────────────────────────────────────────
class RedisCache {
  private fallback: MemoryCache;
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = `${KEY_PREFIX}:${namespace}`;
    this.fallback = new MemoryCache();
  }

  private isRedisReady(): boolean {
    return redisClient !== null && redisClient.status === 'ready';
  }

  private prefixed(key: string): string {
    return key.startsWith(this.namespace) ? key : `${this.namespace}:${key}`;
  }

  public get<T>(key: string): T | null | Promise<T | null> {
    const pk = this.prefixed(key);

    if (!this.isRedisReady()) {
      return this.fallback.get<T>(pk);
    }

    return redisClient!.get(pk).then((raw: string | null) => {
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }).catch(() => this.fallback.get<T>(pk));
  }

  public set(key: string, data: any, ttlMs: number = 300_000): void {
    const pk = this.prefixed(key);

    if (!this.isRedisReady()) {
      this.fallback.set(pk, data, ttlMs);
      return;
    }

    const serialized = JSON.stringify(data);
    redisClient!.set(pk, serialized, 'PX', ttlMs).catch(() => {
      this.fallback.set(pk, data, ttlMs);
    });
  }

  public async invalidate(prefix: string): Promise<void> {
    const pk = this.prefixed(prefix);

    if (!this.isRedisReady()) {
      await this.fallback.invalidate(pk);
      return;
    }

    try {
      const keys = await redisClient!.keys(`${pk}*`);
      if (keys.length > 0) {
        await redisClient!.del(...keys);
      }
    } catch {
      await this.fallback.invalidate(pk);
    }
  }

  public async clear(): Promise<void> {
    if (!this.isRedisReady()) {
      await this.fallback.clear();
      return;
    }

    try {
      const keys = await redisClient!.keys(`${this.namespace}:*`);
      if (keys.length > 0) {
        await redisClient!.del(...keys);
      }
    } catch {
      await this.fallback.clear();
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  Named Cache Instances (one per domain)
// ─────────────────────────────────────────────────────────────
export const postCache          = new RedisCache('posts');
export const adminCache         = new RedisCache('admin');
export const directoryCache     = new RedisCache('dir');
export const profileCache       = new RedisCache('profile');
export const jobsCache          = new RedisCache('jobs');
export const eventsCache        = new RedisCache('events');
export const donationsCache     = new RedisCache('donations');
export const newsCache          = new RedisCache('news');
export const mentorsCache       = new RedisCache('mentors');
export const connectionsCache   = new RedisCache('conn');
export const notificationsCache = new RedisCache('notif');
export const analyticsCache     = new RedisCache('analytics');
export const homepageCache      = new RedisCache('home');
export const groupsCache        = new RedisCache('groups');
