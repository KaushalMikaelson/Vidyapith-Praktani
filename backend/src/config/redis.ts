import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL?.trim() || '';
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX?.trim() || 'vp';

let redisClient: Redis | null = null;

if (REDIS_URL) {
  redisClient = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 5000,
    commandTimeout: 3000,
    // Suppress reconnection flood in logs
    reconnectOnError: (err: any) => {
      const targetErrors = ['READONLY', 'ECONNREFUSED'];
      return targetErrors.some(e => err.message.includes(e));
    },
  });

  redisClient.on('connect', () => {
    console.log('✅ [Redis] Connected successfully.');
  });

  redisClient.on('error', (err: Error) => {
    // Log once — don't crash the process
    console.warn(`⚠️  [Redis] Connection error: ${err.message}. Falling back to memory cache.`);
  });

  redisClient.on('close', () => {
    console.warn('⚠️  [Redis] Connection closed.');
  });

  // Initiate connection eagerly
  redisClient.connect().catch(() => {
    // Error already handled by the 'error' listener above
  });
} else {
  console.warn('⚠️  [Redis] REDIS_URL not set — using in-process memory cache. Set REDIS_URL in .env to enable Redis.');
}

export { redisClient, KEY_PREFIX };
