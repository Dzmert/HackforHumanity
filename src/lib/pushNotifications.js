// Browser/device push notifications for grant deadline reminders.
// Real Web Push (works with the app closed) is used when VAPID keys are
// configured; otherwise we fall back to Notification API alerts raised while
// the Operations Hub is open.
import { grantsApi } from '@/lib/grants';

const SW_PATH = '/grant-push-sw.js';
const DECLINED = 'grantPush.declined';
const ASKED = 'grantPush.asked';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export const permission = () => (notificationsSupported() ? Notification.permission : 'unsupported');

/** True once the person has said no, so we never nag again. */
export const hasDeclined = () =>
  permission() === 'denied' || localStorage.getItem(DECLINED) === 'true';

export const hasBeenAsked = () => localStorage.getItem(ASKED) === 'true' || permission() !== 'default';

const base64ToUint8Array = (base64) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
};

export async function registerWorker() {
  if (!pushSupported()) return null;
  return navigator.serviceWorker.register(SW_PATH);
}

/**
 * Asks for permission (once), subscribes to Web Push when keys are available and
 * stores the subscription so the background engine can reach this device.
 * Returns { status: 'push' | 'local' | 'denied' | 'unsupported', message }.
 */
export async function enableDeviceNotifications() {
  if (!notificationsSupported()) {
    return { status: 'unsupported', message: 'This browser cannot show device notifications.' };
  }

  localStorage.setItem(ASKED, 'true');
  const outcome = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (outcome !== 'granted') {
    localStorage.setItem(DECLINED, 'true');
    return { status: 'denied', message: 'Notifications are blocked for this site. You can allow them in your browser settings.' };
  }
  localStorage.removeItem(DECLINED);

  if (!pushSupported()) {
    return { status: 'local', message: 'Reminders will appear while the Operations Hub is open in this browser.' };
  }

  const { publicKey } = await grantsApi.getPushConfig();
  if (!publicKey) {
    return {
      status: 'local',
      message: 'Push keys are not configured yet, so reminders will appear while the Operations Hub is open in this browser.'
    };
  }

  const registration = await registerWorker();
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(publicKey)
  });

  const json = subscription.toJSON();
  await grantsApi.savePushSubscription({
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    userAgent: navigator.userAgent
  });

  return { status: 'push', message: 'This device will now receive grant reminders, even when the app is closed.' };
}

/** Keeps an already-granted device subscribed (e.g. after a browser refresh). */
export async function refreshSubscription() {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    const { publicKey } = await grantsApi.getPushConfig();
    if (!publicKey) return false;
    const registration = await registerWorker();
    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    const json = subscription.toJSON();
    await grantsApi.savePushSubscription({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      userAgent: navigator.userAgent
    });
    return true;
  } catch {
    return false;
  }
}

export async function disableDeviceNotifications() {
  localStorage.setItem(DECLINED, 'true');
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  const subscription = registration && await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await grantsApi.removePushSubscription(endpoint);
}