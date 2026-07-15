self.addEventListener('push', event => {
  let title = 'Armador';
  let body = 'Revisar asistencia';

  if (event.data) {
    try {
      const d = event.data.json();
      if (d.title) title = d.title;
      if (d.body) body = d.body;
    } catch (_) {}
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'armador',
      renotify: true,
      requireInteraction: true,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
