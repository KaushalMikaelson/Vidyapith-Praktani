import { apiFetch } from './api';

export interface NotificationSettings {
  browser_enabled: boolean;
  email_crucial_enabled: boolean;
  browser_configured: boolean;
  has_browser_subscription: boolean;
  vapid_public_key: string | null;
}

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export const browserNotificationsSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

export const getBrowserNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!browserNotificationsSupported()) return 'unsupported';
  return Notification.permission;
};

export const fetchNotificationSettings = async (): Promise<NotificationSettings> =>
  apiFetch('/notifications/settings');

export const updateNotificationSettings = async (settings: Partial<Pick<NotificationSettings, 'browser_enabled' | 'email_crucial_enabled'>>) =>
  apiFetch('/notifications/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings)
  });

export const enableBrowserNotifications = async (): Promise<void> => {
  if (!browserNotificationsSupported()) {
    throw new Error('This browser does not support push notifications.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Browser notification permission was not granted.');
  }

  const config = await apiFetch('/notifications/push/config');
  if (!config?.publicKey) {
    throw new Error('Browser push is not configured on the server.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(config.publicKey)
  });

  await apiFetch('/notifications/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription })
  });
};

export const disableBrowserNotifications = async (): Promise<void> => {
  let endpoint: string | undefined;

  if (browserNotificationsSupported()) {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    endpoint = subscription?.endpoint;
    await subscription?.unsubscribe();
  }

  await apiFetch('/notifications/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint })
  });
};
