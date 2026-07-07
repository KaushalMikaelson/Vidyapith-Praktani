import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || 'redis://127.0.0.1:6379';
const isTLS = REDIS_URL.startsWith('rediss://');

// BullMQ requires its own connection options object (not a shared ioredis client instance)
// to avoid type conflicts between BullMQ's internal ioredis bundle and any top-level ioredis.
function parseRedisUrl(url: string): { host: string; port: number; password?: string; tls?: object } {
  try {
    const parsed = new URL(url);
    const opts: { host: string; port: number; password?: string; tls?: object } = {
      host: parsed.hostname || '127.0.0.1',
      port: parseInt(parsed.port || '6379', 10)
    };
    if (parsed.password) opts.password = decodeURIComponent(parsed.password);
    if (isTLS) opts.tls = { rejectUnauthorized: false };
    return opts;
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

const connection = parseRedisUrl(REDIS_URL);

export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
});

notificationQueue.on('error', (err: Error) => {
  console.error('[Notification Queue] Error:', err.message);
});

console.log('[Notification Queue] Initialized — connected to Redis');
