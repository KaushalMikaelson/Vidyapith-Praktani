import { redisClient, KEY_PREFIX } from '../config/redis.js';
import { prisma } from '../config/db.js';

const OTP_TTL_SECONDS = 900;    // 15 minutes
const RESET_TTL_SECONDS = 900;  // 15 minutes

function isRedisReady(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

// ─────────────────────────────────────────────────────────────
//  OTP Storage (Redis-first, Prisma fallback)
// ─────────────────────────────────────────────────────────────

export async function setOTP(email: string, otp: string): Promise<void> {
  const key = `${KEY_PREFIX}:otp:${email.toLowerCase()}`;

  if (isRedisReady()) {
    await redisClient!.set(key, otp, 'EX', OTP_TTL_SECONDS);
    return;
  }

  // Fallback: persist in database
  const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
  await prisma.oTP.upsert({
    where:  { email: email.toLowerCase() },
    update: { otp, expires_at, created_at: new Date() },
    create: { email: email.toLowerCase(), otp, expires_at }
  });
}

export async function getOTP(email: string): Promise<string | null> {
  const key = `${KEY_PREFIX}:otp:${email.toLowerCase()}`;

  if (isRedisReady()) {
    return redisClient!.get(key);
  }

  // Fallback: check database
  const record = await prisma.oTP.findUnique({ where: { email: email.toLowerCase() } });
  if (!record || record.expires_at.getTime() < Date.now()) return null;
  return record.otp;
}

export async function deleteOTP(email: string): Promise<void> {
  const key = `${KEY_PREFIX}:otp:${email.toLowerCase()}`;

  if (isRedisReady()) {
    await redisClient!.del(key);
    return;
  }

  // Fallback: clean up from database
  await prisma.oTP.deleteMany({ where: { email: email.toLowerCase() } }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────
//  Password Reset Token Storage (Redis-first, Prisma fallback)
// ─────────────────────────────────────────────────────────────

export async function setResetToken(email: string, token: string): Promise<void> {
  const key = `${KEY_PREFIX}:pwreset:${token}`;

  if (isRedisReady()) {
    await redisClient!.set(key, email.toLowerCase(), 'EX', RESET_TTL_SECONDS);
    return;
  }

  // Fallback: persist in database
  const expires_at = new Date(Date.now() + RESET_TTL_SECONDS * 1000);
  await prisma.passwordReset.upsert({
    where:  { email: email.toLowerCase() },
    update: { token, expires_at, created_at: new Date() },
    create: { email: email.toLowerCase(), token, expires_at }
  });
}

export async function getResetToken(token: string): Promise<string | null> {
  const key = `${KEY_PREFIX}:pwreset:${token}`;

  if (isRedisReady()) {
    return redisClient!.get(key);  // returns email or null
  }

  // Fallback: check database
  const record = await prisma.passwordReset.findUnique({ where: { token } });
  if (!record || record.expires_at.getTime() < Date.now()) return null;
  return record.email;
}

export async function deleteResetToken(token: string): Promise<void> {
  const key = `${KEY_PREFIX}:pwreset:${token}`;

  if (isRedisReady()) {
    await redisClient!.del(key);
    return;
  }

  // Fallback: clean up from database
  await prisma.passwordReset.deleteMany({ where: { token } }).catch(() => {});
}
