import { redisClient, KEY_PREFIX } from '../config/redis.js';

function isRedisReady(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

/**
 * Block a JWT token by its JTI (JWT ID).
 * The token auto-expires from Redis when its TTL elapses.
 * @param jti  - The unique JWT ID (jti claim)
 * @param expiresInSeconds - Remaining valid lifetime of the token in seconds
 */
export async function blockToken(jti: string, expiresInSeconds: number): Promise<void> {
  if (!jti || expiresInSeconds <= 0) return;
  if (!isRedisReady()) return; // No Redis — blocklist not available

  const key = `${KEY_PREFIX}:blocklist:${jti}`;
  await redisClient!.set(key, '1', 'EX', expiresInSeconds).catch(() => {
    console.warn('[TokenBlocklist] Failed to block token — Redis write error.');
  });
}

/**
 * Check if a JWT token has been blocklisted (i.e., user logged out).
 * Returns false (not blocked) if Redis is unavailable — fail open.
 */
export async function isBlocked(jti: string): Promise<boolean> {
  if (!jti) return false;
  if (!isRedisReady()) return false; // Fail open if Redis unavailable

  const key = `${KEY_PREFIX}:blocklist:${jti}`;
  try {
    const exists = await redisClient!.exists(key);
    return exists === 1;
  } catch {
    return false;
  }
}
