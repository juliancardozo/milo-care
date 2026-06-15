/* Service Worker de Milo Care — notificaciones push. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'Milo Care 🐾';
  const options = {
    body: data.body || '',
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    tag: data.type || 'milocare',
    renotify: true,
    data: data.data || {},
    actions: Array.isArray(data.actions) ? data.actions.slice(0, 3) : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  // Si tocó una acción (bien/regular/mal), abrir su URL de respuesta; si no, la app.
  const url = (event.action && d.urls && d.urls[event.action]) || d.url || '/dashboard';

  // Conversion tracking (Fase 4): avisar el clic al backend. Best-effort, no bloquea.
  const trackClick = d.click
    ? fetch('/api/notifications/clicked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d.click),
        keepalive: true,
      }).catch(() => {})
    : Promise.resolve();

  event.waitUntil(
    Promise.all([
      trackClick,
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        // Si hay una ventana abierta y es una acción sin URL específica, enfocarla.
        const existing = clients.find((c) => 'focus' in c);
        if (existing && !event.action) return existing.focus();
        return self.clients.openWindow(url);
      }),
    ])
  );
});
