/* Service worker for Lou's Place grant deadline reminders.
   Receives Web Push messages while the app is closed and opens the
   relevant grant when the notification is clicked. */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { title: "Lou's Place — Grant Reminder", body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || "Lou's Place — Grant Reminder";
  const options = {
    body: payload.body || '',
    tag: payload.tag || undefined,
    renotify: false,
    data: { url: payload.url || '/' },
    badge: '/favicon.ico',
    icon: '/favicon.ico'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
