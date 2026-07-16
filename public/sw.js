self.addEventListener('push', event => {
  let title = 'Armador';
  let body = 'Revisar asistencia';
  let alarmId = null;

  if (event.data) {
    try {
      const d = event.data.json();
      if (d.title) title = d.title;
      if (d.body) body = d.body;
      if (d.alarmId) alarmId = d.alarmId;
    } catch (_) {}
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // iOS Safari doesn't pass `data` through to notificationclick, so the
      // alarm id rides on `tag` too — iOS does deliver that one reliably.
      tag: alarmId || 'armador',
      renotify: true,
      requireInteraction: true,
      data: { alarmId },
    })
  );
});

self.addEventListener('notificationclick', event => {
  const alarmId = event.notification.data?.alarmId || event.notification.tag;
  event.notification.close();

  event.waitUntil(
    Promise.all([
      // Tell the server to stop ringing — best-effort, ignore failures.
      alarmId
        ? fetch('/api/ack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: alarmId }),
          }).catch(() => {})
        : Promise.resolve(),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) {
          if ('focus' in c) return c.focus();
        }
        if (clients.openWindow) return clients.openWindow('/');
      }),
    ])
  );
});
