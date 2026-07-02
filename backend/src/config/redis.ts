import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL?.trim() || '';
export const KEY_PREFIX = process.env.REDIS_KEY_PREFIX?.trim() || 'vp';

let redisClient: Redis | null = null;
let redisDisabled = false;

function disableRedis(reason: string) {
  if (redisDisabled) return;
  redisDisabled = true;
  console.warn(`[Redis] ${reason}. Redis disabled for this process; using fallback storage.`);

  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
}

if (REDIS_URL) {
  const isTLS = REDIS_URL.startsWith('rediss://');

  redisClient = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 5_000,
    commandTimeout: 5_000,
    ...(isTLS
      ? {
          tls: {
            rejectUnauthorized: false,
          },
        }
      : {}),
    reconnectOnError: (err: Error) => {
      const retryErrors = ['READONLY', 'ECONNREFUSED', 'ECONNRESET'];
      return retryErrors.some((e) => err.message?.includes(e));
    },
    retryStrategy: (times: number) => {
      if (redisDisabled || times > 1) return null;
      return 500;
    },
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connected to Upstash Redis successfully.');
  });

  redisClient.on('ready', () => {
    console.log('[Redis] Ready to serve cached responses.');
  });

  redisClient.on('error', (err: Error) => {
    if (/EAI_AGAIN|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(err.message)) {
      disableRedis(`Connection failed (${err.message})`);
      return;
    }

    console.warn(`[Redis] Error: ${err.message}. Falling back to in-memory cache.`);
  });

  redisClient.on('close', () => {
    if (!redisDisabled) {
      console.warn('[Redis] Connection closed. Using fallback cache until reconnect succeeds.');
    }
  });

  redisClient.connect().catch(() => {
    // Error details are handled by the 'error' listener above.
  });
} else {
  console.warn('[Redis] REDIS_URL not set - using in-process memory cache. Set REDIS_URL in .env to enable Redis.');
}

export { redisClient };
