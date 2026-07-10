import { Queue } from 'bullmq';
import { redisClient } from '../config/redis.js';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || 'redis://127.0.0.1:6379';
const isTLS = REDIS_URL.startsWith('rediss://');

// BullMQ connection options parser
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

// In-memory fallback queue for local development / connection failures
class MockQueue {
  async add(name: string, data: any) {
    console.log(`[Mock Queue] Enqueued job: ${name} (in-memory execution fallback)`);
    setTimeout(async () => {
      try {
        const { executeNotificationJob } = await import('./notification.worker.js');
        await executeNotificationJob(name, data);
      } catch (err: any) {
        console.error(`[Mock Queue] Error executing job ${name}:`, err.message);
      }
    }, 0);
    return { id: `mock-${Date.now()}` };
  }
  on() {}
}

let realQueue: Queue | null = null;
let useMock = false;

export const notificationQueue = new Proxy({} as Queue, {
  get(target, prop) {
    if (useMock) {
      return (new MockQueue() as any)[prop];
    }

    if (!realQueue) {
      if (!REDIS_URL || (redisClient && (redisClient as any).status === 'end') || (redisClient as any)?.status === 'close') {
        useMock = true;
        console.warn('[Notification Queue] Redis is unavailable. Falling back to in-memory MockQueue.');
        return (new MockQueue() as any)[prop];
      }

      try {
        realQueue = new Queue('notifications', {
          connection,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 200,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
          }
        });

        realQueue.on('error', (err: Error) => {
           console.error('[Notification Queue] Error:', err.message);
           if (/EAI_AGAIN|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EACCES/i.test(err.message)) {
             console.warn('[Notification Queue] Connection failed. Switching to in-memory MockQueue.');
             useMock = true;
             if (realQueue) {
               realQueue.close().catch(() => {});
               realQueue = null;
             }
           }
         });
      } catch (err: any) {
        console.error('[Notification Queue] Failed to initialize Queue, using fallback:', err.message);
        useMock = true;
        return (new MockQueue() as any)[prop];
      }
    }

    const value = (realQueue as any)[prop];
    if (typeof value === 'function') {
      return value.bind(realQueue);
    }
    return value;
  }
});
