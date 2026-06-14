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

  public set(key: string, data: any, ttlMs: number = 300000): void { // Default 5 minutes
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  public invalidate(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const postCache = new MemoryCache();
export const directoryCache = new MemoryCache();
export const jobsCache = new MemoryCache();
export const eventsCache = new MemoryCache();
export const donationsCache = new MemoryCache();
export const newsCache = new MemoryCache();
export const mentorsCache = new MemoryCache();
