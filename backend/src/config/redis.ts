import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL?.trim() || '';
export const KEY_PREFIX = process.env.REDIS_KEY_PREFIX?.trim() || 'vp';

let redisClient: Redis | null = null;

if (REDIS_URL) {
  // Detect TLS (Upstash uses rediss:// scheme)
  const isTLS = REDIS_URL.startsWith('rediss://');

  redisClient = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 10_000,
    commandTimeout: 5_000,
    // Required for Upstash TLS connections
    ...(isTLS ? {
      tls: {
        rejectUnauthorized: false,  // Upstash uses wildcard cert
      }
    } : {}),
    reconnectOnError: (err: any) => {
      const retryErrors = ['READONLY', 'ECONNREFUSED', 'ECONNRESET'];
      return retryErrors.some(e => err.message?.includes(e));
    },
    retryStrategy: (times: number) => {
      if (times > 3) return null;  // Give up after 3 attempts, fall back to memory
      return Math.min(times * 200, 1000);
    },
  });

  redisClient.on('connect', () => {
    console.log('✅ [Redis] Connected to Upstash Redis successfully.');
  });

  redisClient.on('ready', () => {
    console.log('✅ [Redis] Ready to serve cached responses.');
  });

  redisClient.on('error', (err: Error) => {
    console.warn(`⚠️  [Redis] Error: ${err.message}. Falling back to in-memory cache.`);
  });

  redisClient.on('close', () => {
    console.warn('⚠️  [Redis] Connection closed. Will attempt reconnect...');
  });

  // Initiate connection eagerly
  redisClient.connect().catch(() => {
    // Error already handled by the 'error' listener above
  });
} else {
  console.warn('⚠️  [Redis] REDIS_URL not set — using in-process memory cache. Set REDIS_URL in .env to enable Redis.');
}

export { redisClient };
