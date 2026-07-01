import { Request, Response, NextFunction } from 'express';
import { redisClient, KEY_PREFIX } from '../config/redis.js';

// Fallback: in-memory map for when Redis is unavailable
const memoryMap = new Map<string, { count: number; resetTime: number }>();

function isRedisReady(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

/**
 * Redis sliding-window rate limiter.
 * Falls back to in-process Map when Redis is unavailable.
 *
 * @param limit     - Max requests allowed per window
 * @param windowMs  - Window duration in milliseconds
 */
export const rateLimiter = (limit: number, windowMs: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const windowKey = Math.floor(Date.now() / windowMs); // Bucket ID
    const key = `${KEY_PREFIX}:rl:${ip}:${windowKey}`;

    if (isRedisReady()) {
      try {
        // Atomic increment
        const count = await redisClient!.incr(key);

        // On first request in window, set expiry
        if (count === 1) {
          await redisClient!.pexpire(key, windowMs);
        }

        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
        res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);

        if (count > limit) {
          res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
          res.status(429).json({
            error: 'Too many requests from this IP. Please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
          });
          return;
        }

        next();
        return;
      } catch {
        // Redis error — fall through to memory fallback
      }
    }

    // ── Fallback: in-memory Map ───────────────────────────────
    const now = Date.now();
    const rateData = memoryMap.get(ip);

    if (!rateData || now > rateData.resetTime) {
      memoryMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    rateData.count++;
    if (rateData.count > limit) {
      res.status(429).json({
        error: 'Too many requests from this IP. Please try again later.'
      });
      return;
    }

    next();
  };
};
