import { PrismaClient } from '@prisma/client';

const isLocalDemo = !process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '';

if (isLocalDemo) {
  console.warn('\n⚠️  [DB] DATABASE_URL is not set — running in local demo mode.');
  console.warn('   Database calls will throw a clear error. Set DATABASE_URL to enable persistence.\n');
}

// Real Prisma client — only used when DATABASE_URL is present.
// Suppress 'error' level logs to quiet Neon's normal idle-connection-closed messages.
// Real errors are still surfaced via caught exceptions in controllers.
const _prisma = isLocalDemo ? null : new PrismaClient({
  errorFormat: 'minimal',
  log: [
    { level: 'warn', emit: 'stdout' },
    // Do NOT emit 'error' via stdout — Neon pgBouncer regularly closes idle
    // connections (kind: Closed, cause: None) which is not an actual error.
  ],
});

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

export function isDatabaseConnectivityError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /Can't reach database server|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|P1001/i.test(message);
}

export function getDatabaseUnavailableMessage(): string {
  return 'Database is temporarily unreachable. Please check your internet/DNS connection and make sure the Neon database is running, then try again.';
}
