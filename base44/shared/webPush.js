// Web Push delivery for grant deadline reminders.
// VAPID keys are supplied by the caller (read from app secrets in the function),
// never hardcoded. Without keys the caller falls back to logging only.
import { longDate } from './grantReminders.js';

const remainingText = (days) => (days === 0 ? 'today' : days === 1 ? 'in 1 day' : `in ${days} days`);

/** Notification content, e.g. "Essential Services Support: Financial acquittal due in 3 days." */
export function composePush(item, appUrl = '/') {
  const grantName = item.grant.grantName || item.grant.name || 'Grant';
  const what = item.requirement
    ? item.requirement.title || 'Compliance requirement'
    : item.deadlineType === 'Acquittal Due Date'
      ? item.grant.acquittalType || 'Acquittal'
      : item.deadlineType === 'Application Due Date' ? 'Application' : 'Renewal';
  const base = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  return {
    title: "Lou's Place — Grant Reminder",
    body: `${grantName}: ${what} due ${remainingText(item.remaining)} (${longDate(item.deadlineDate)}).`,
    url: `${base}/?module=grants&grant=${item.grant.id}`,
    tag: `grant-${item.grant.id}-${item.deadlineDate}-${item.interval}`
  };
}

export function vapidFrom(get) {
  const publicKey = (get('VAPID_PUBLIC_KEY') || '').trim();
  const privateKey = (get('VAPID_PRIVATE_KEY') || '').trim();
  const subject = (get('VAPID_SUBJECT') || '').trim() || 'mailto:admin@example.org';
  return publicKey && privateKey ? { publicKey, privateKey, subject } : null;
}

/**
 * Sends one payload to every subscription.
 * Returns { sent, failed, expiredEndpoints } so dead subscriptions can be pruned.
 */
export async function sendPush(subscriptions, payload, vapid) {
  const result = { sent: 0, failed: 0, expiredEndpoints: [] };
  if (!subscriptions.length) return result;

  const webpush = (await import('npm:web-push@3.6.7')).default;
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(payload)
      );
      result.sent += 1;
    } catch (error) {
      const status = error?.statusCode;
      if (status === 404 || status === 410) result.expiredEndpoints.push(subscription.endpoint);
      else console.error(`Push to ${subscription.endpoint.slice(0, 60)}… failed: ${error.message}`);
      result.failed += 1;
    }
  }
  return result;
}