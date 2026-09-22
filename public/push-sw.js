/*
  Handlers de notificaciones push. vite-plugin-pwa los mete dentro del service worker generado
  (ver vite.config.ts → workbox.importScripts). Cuando llega un push del servidor (aunque la app
  esté cerrada), este código la muestra; al tocarla, abre o enfoca la app.
*/
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Avodah', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Avodah';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    }),
  );
});
