import { prisma } from '../config/db.js';
import { Worker } from 'bullmq';
import { createNotification } from './notification.service.js';
import { notificationRules, NotificationTriggerType } from './notification.rules.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const isTLS = REDIS_URL.startsWith('rediss://');

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

export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { name, data } = job;
    console.log(`[Notification Worker] Processing job ${job.id} (name: ${name})`);

    try {
      switch (name) {
        case 'broadcast': {
          const { type, actorId, title, body, actionUrl } = data as {
            type: NotificationTriggerType;
            actorId: string;
            title: string;
            body: string;
            actionUrl: string;
          };

          const rule = notificationRules[type];
          const sendBrowser = rule?.push ?? true;
          const sendEmail = rule?.email ?? false;

          // Fetch all approved users except the actor
          const users = await prisma.user.findMany({
            where: { verify_status: 'approved', id: { not: actorId } },
            select: { id: true }
          });

          console.log(`[Notification Worker] Broadcasting type "${type}" to ${users.length} users`);

          // Process in batches of 100
          const batchSize = 100;
          for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            await Promise.all(
              batch.map((user) =>
                createNotification({
                  userId: user.id,
                  title,
                  body,
                  type: 'info',
                  crucial: type === 'EVENT_CREATED' || type === 'NEWS_CREATED' || type === 'JOB_POSTED',
                  actionUrl,
                  sendBrowser,
                  sendEmail
                }).catch((err: Error) => {
                  console.error(`[Notification Worker] Failed for user ${user.id}:`, err.message);
                })
              )
            );
          }
          break;
        }

        case 'group_broadcast': {
          const { type, groupId, actorId, title, body, actionUrl } = data as {
            type: NotificationTriggerType;
            groupId: string;
            actorId: string;
            title: string;
            body: string;
            actionUrl: string;
          };

          const rule = notificationRules[type];
          const sendBrowser = rule?.push ?? true;
          const sendEmail = rule?.email ?? false;

          const members = await prisma.groupMember.findMany({
            where: { group_id: groupId, user_id: { not: actorId } },
            select: { user_id: true }
          });

          console.log(`[Notification Worker] Group broadcast "${type}" to ${members.length} members in group ${groupId}`);

          const batchSize = 100;
          for (let i = 0; i < members.length; i += batchSize) {
            const batch = members.slice(i, i + batchSize);
            await Promise.all(
              batch.map((member) =>
                createNotification({
                  userId: member.user_id,
                  title,
                  body,
                  type: 'info',
                  actionUrl,
                  sendBrowser,
                  sendEmail
                }).catch((err: Error) => {
                  console.error(`[Notification Worker] Failed for group member ${member.user_id}:`, err.message);
                })
              )
            );
          }
          break;
        }

        case 'direct': {
          const { type, targetId, title, body, actionUrl, crucial } = data as {
            type: NotificationTriggerType;
            targetId: string;
            title: string;
            body: string;
            actionUrl: string;
            crucial?: boolean;
          };

          const rule = notificationRules[type];
          const sendBrowser = rule?.push ?? true;
          const sendEmail = rule?.email ?? false;

          console.log(`[Notification Worker] Direct "${type}" to user ${targetId}`);

          await createNotification({
            userId: targetId,
            title,
            body,
            type: crucial ? 'alert' : 'info',
            crucial: crucial ?? false,
            actionUrl,
            sendBrowser,
            sendEmail
          });
          break;
        }

        default:
          console.warn(`[Notification Worker] Unknown job name: "${name}" — skipping`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Notification Worker] Error on job ${job.id}:`, message);
      throw err;
    }
  },
  {
    connection,
    concurrency: 5
  }
);

notificationWorker.on('completed', (job) => {
  console.log(`[Notification Worker] Job ${job.id} (${job.name}) completed`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[Notification Worker] Job ${job?.id} (${job?.name}) failed:`, err.message);
});

console.log('[Notification Worker] Started — listening for notification jobs');
