import webpush, { PushSubscription as WebPushSubscription } from 'web-push';
import { prisma } from '../config/db.js';
import { notificationsCache } from '../utils/cache.js';
import { sendMail } from './mail.service.js';

export type NotificationType = 'info' | 'success' | 'alert';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  crucial?: boolean;
  actionUrl?: string;
  sendBrowser?: boolean;
  sendEmail?: boolean;
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:no-reply@vidyapithconnect.in';

const webPushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (webPushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('[Notifications] VAPID keys are not configured. Browser subscriptions will be saved, but push delivery is disabled.');
}

const toWebPushSubscription = (subscription: { endpoint: string; p256dh: string; auth: string }): WebPushSubscription => ({
  endpoint: subscription.endpoint,
  keys: {
    p256dh: subscription.p256dh,
    auth: subscription.auth
  }
});

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const normalizeActionUrl = (actionUrl?: string): string | undefined => {
  if (!actionUrl) return undefined;
  if (/^https?:\/\//i.test(actionUrl)) return actionUrl;

  const screen = actionUrl.replace(/^\//, '').trim();
  const knownScreens = new Set([
    'admin',
    'directory',
    'donations',
    'events',
    'feed',
    'jobs',
    'mentorship',
    'messages',
    'notifications',
    'profile'
  ]);

  if (knownScreens.has(screen)) {
    return `/?screen=${screen}`;
  }

  return actionUrl;
};

export const getBrowserNotificationPublicKey = (): string => VAPID_PUBLIC_KEY;

export const createNotification = async ({
  userId,
  title,
  body,
  type = 'info',
  crucial = false,
  actionUrl,
  sendBrowser = true,
  sendEmail
}: CreateNotificationInput) => {
  const normalizedActionUrl = normalizeActionUrl(actionUrl);
  const notification = await prisma.notification.create({
    data: {
      user_id: userId,
      title,
      body,
      type,
      crucial,
      action_url: normalizedActionUrl || null,
      read: false
    }
  });

  await notificationsCache.invalidate(`list:${userId}`);

  const shouldEmail = sendEmail ?? crucial;
  void deliverNotification({
    userId,
    title,
    body,
    type,
    crucial,
    actionUrl: normalizedActionUrl,
    notificationId: notification.id,
    sendBrowser,
    sendEmail: shouldEmail
  });

  return notification;
};

const deliverNotification = async ({
  userId,
  title,
  body,
  type,
  crucial,
  actionUrl,
  notificationId,
  sendBrowser,
  sendEmail
}: Required<Pick<CreateNotificationInput, 'userId' | 'title' | 'body' | 'type' | 'crucial' | 'sendBrowser' | 'sendEmail'>> & {
  actionUrl?: string;
  notificationId: string;
}) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { notification_preference: true }
    });

    if (!user) return;

    const preferences = user.notification_preference;
    const browserEnabled = preferences?.browser_enabled ?? true;
    const emailCrucialEnabled = preferences?.email_crucial_enabled ?? true;

    if (sendBrowser && browserEnabled && webPushConfigured) {
      await sendBrowserPush(userId, { title, body, type, crucial, actionUrl, notificationId });
    }

    if (sendEmail && emailCrucialEnabled) {
      const subject = crucial ? `[Important] ${title}` : title;
      const text = `${title}\n\n${body}`;
      const html = `
        <p><strong>${escapeHtml(title)}</strong></p>
        <p>${escapeHtml(body)}</p>
        ${actionUrl ? `<p><a href="${escapeHtml(actionUrl)}">Open Vidyapith Connect</a></p>` : ''}
      `;
      await sendMail(user.email, subject, text, html);
    }
  } catch (error) {
    console.error('[Notifications] Delivery failed:', error);
  }
};

const sendBrowserPush = async (
  userId: string,
  payload: {
    title: string;
    body: string;
    type: NotificationType;
    crucial: boolean;
    actionUrl?: string;
    notificationId: string;
  }
) => {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user_id: userId, enabled: true }
  });

  if (subscriptions.length === 0) return;

  const message = JSON.stringify({
    ...payload,
    icon: '/logo.png',
    badge: '/favicon.ico'
  });

  await Promise.all(subscriptions.map(async subscription => {
    try {
      await webpush.sendNotification(toWebPushSubscription(subscription), message);
    } catch (error: any) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
        return;
      }
      console.error(`[Notifications] Browser push failed for subscription ${subscription.id}:`, error);
    }
  }));
};

export const savePushSubscription = async (
  userId: string,
  subscription: WebPushSubscription,
  userAgent?: string
) => {
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error('Invalid browser push subscription.');
  }

  const saved = await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      user_id: userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent || null,
      enabled: true
    },
    create: {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent || null,
      enabled: true
    }
  });

  await prisma.notificationPreference.upsert({
    where: { user_id: userId },
    update: { browser_enabled: true },
    create: { user_id: userId, browser_enabled: true, email_crucial_enabled: true }
  });

  return saved;
};

export const disablePushSubscription = async (userId: string, endpoint?: string) => {
  if (endpoint) {
    await prisma.pushSubscription.updateMany({
      where: { user_id: userId, endpoint },
      data: { enabled: false }
    });
    return;
  }

  await prisma.pushSubscription.updateMany({
    where: { user_id: userId },
    data: { enabled: false }
  });
};

export const getNotificationPreferences = async (userId: string) => {
  const [preferences, activeSubscriptionCount] = await Promise.all([
    prisma.notificationPreference.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId, browser_enabled: true, email_crucial_enabled: true }
    }),
    prisma.pushSubscription.count({ where: { user_id: userId, enabled: true } })
  ]);

  return {
    browser_enabled: preferences.browser_enabled,
    email_crucial_enabled: preferences.email_crucial_enabled,
    browser_configured: webPushConfigured,
    has_browser_subscription: activeSubscriptionCount > 0,
    vapid_public_key: VAPID_PUBLIC_KEY || null
  };
};

export const updateNotificationPreferences = async (
  userId: string,
  data: { browser_enabled?: boolean; email_crucial_enabled?: boolean }
) => {
  const preferences = await prisma.notificationPreference.upsert({
    where: { user_id: userId },
    update: {
      ...(typeof data.browser_enabled === 'boolean' ? { browser_enabled: data.browser_enabled } : {}),
      ...(typeof data.email_crucial_enabled === 'boolean' ? { email_crucial_enabled: data.email_crucial_enabled } : {})
    },
    create: {
      user_id: userId,
      browser_enabled: data.browser_enabled ?? true,
      email_crucial_enabled: data.email_crucial_enabled ?? true
    }
  });

  if (data.browser_enabled === false) {
    await disablePushSubscription(userId);
  }

  return preferences;
};
