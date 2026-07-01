import { PrismaClient } from '@prisma/client';

const isLocalDemo = !process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '';

if (isLocalDemo) {
  console.warn('\n⚠️  [DB] DATABASE_URL is not set — running in local demo mode.');
  console.warn('   Database calls will throw a clear error. Set DATABASE_URL to enable persistence.\n');
}

// Real Prisma client — only used when DATABASE_URL is present.
const _prisma = isLocalDemo ? null : new PrismaClient({ log: ['warn', 'error'] });

/**
 * In production: real PrismaClient connected to Postgres.
 * Locally (no DATABASE_URL): every call throws a descriptive error
 * instead of crashing the server on startup.
 */
export const prisma = isLocalDemo
  ? (new Proxy({} as PrismaClient, {
      get(_target, prop) {
        return () => {
          throw new Error(
            `[DB] Cannot run query — DATABASE_URL is not configured. ` +
            `Set it in your .env file to enable database access. (called: ${String(prop)})`
          );
        };
      }
    }))
  : _prisma!;

