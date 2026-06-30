// public/push-sw.js
// Handles incoming Web Push events and displays OS-level notifications,
// even when the app/tab is closed.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'TripFlow', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'TripFlow';
  const options = {
    body: data.message || data.body || '',
    icon: data.icon || '/vite.svg',
    badge: data.badge || '/vite.svg',
    data: {
      url: data.url || '/dashboard/notifications',
    },
    tag: data.tag || undefined,
    renotify: !!data.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});