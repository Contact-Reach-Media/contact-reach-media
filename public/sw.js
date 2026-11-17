// ContactReach Market Progressive Web App Service Worker
const CACHE_NAME = 'crm-cache-v4';
const API_CACHE_NAME = 'crm-api-cache-v4';
const STATIC_ASSETS = [
  '/manifest.json',
  '/site.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/apple-touch-icon.png',
  '/logo.png',
  '/logo-circle.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA SW] Precache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle message events from client for cache invalidation, hot-update, and direct push notification
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    if (event.data.type === 'CLEAR_CACHE') {
      caches.keys().then((keys) => Promise.all(keys.map(k => caches.delete(k))));
    }
    if (event.data.type === 'TRIGGER_NOTIFICATION') {
      const { title, options } = event.data;
      self.registration.showNotification(title || '🔔 New Order Received!', options || {
        body: 'A new customer order has arrived live in the admin dashboard.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `crm-order-${Date.now()}`,
        requireInteraction: true
      });
    }
  }
});

// Push event handler for Web Push Notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'ContactReach Market Alert', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 New Order Received!';
  const options = {
    body: data.body || 'A customer has just placed a new order on ContactReach Market.',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || `crm-order-${Date.now()}`,
    data: data.data || { url: '/?view=admin&tab=orders' },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler: opens or focuses the admin dashboard and navigates to orders
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?view=admin&tab=orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (client.navigate && client.url && !client.url.includes('view=admin')) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST /api/auth/login)
  if (request.method !== 'GET') {
    return;
  }

  // Bypass service worker for Vite dev endpoints, SSE real-time streams, version checks, auth, and dynamic translation API
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('/stream') ||
    url.pathname.includes('/realtime') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/version') ||
    url.pathname.startsWith('/api/sync') ||
    url.pathname.startsWith('/api/translate')
  ) {
    return;
  }

  // Handle API requests: network first with offline cached fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ error: 'Offline mode active' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Handle navigation, HTML, and app code bundles with Network-First so fresh updates always load immediately
  const isCodeOrNavigation =
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.css');

  if (isCodeOrNavigation) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => networkResponse)
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
          )
        )
    );
    return;
  }

  // Static images/icons: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || Response.error());

      return cachedResponse || fetchPromise;
    })
  );
});
