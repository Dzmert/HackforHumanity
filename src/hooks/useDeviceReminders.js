import { useEffect } from 'react';
import { grantsApi } from '@/lib/grants';

/**
 * Raises grant reminders that are due today as real device notifications — the
 * operating system pop-up, outside the app window. Service worker notifications
 * are used when available (they are the true OS pop-up and survive tab focus
 * changes), with the plain Notification API as a fallback.
 */
export default function useDeviceReminders(enabled) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    let cancelled = false;

    const show = async (reminder) => {
      const options = {
        body: reminder.message,
        tag: reminder.reminderKey,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        data: { url: `/?module=grants&grant=${reminder.grantId}` }
      };
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/grant-push-sw.js')
          || await navigator.serviceWorker.register('/grant-push-sw.js');
        await navigator.serviceWorker.ready;
        await registration.showNotification(reminder.title, options);
        return;
      }
      new Notification(reminder.title, options);
    };

    const run = async () => {
      try {
        const { reminders } = await grantsApi.dueDeviceReminders();
        if (cancelled || !reminders?.length) return;
        for (const reminder of reminders) {
          await show(reminder);
          await grantsApi.logDeviceReminder(reminder);
        }
      } catch {
        // Reminders are a convenience; a failure must never break the page.
      }
    };

    run();
    return () => { cancelled = true; };
  }, [enabled]);
}