// ContactReach Market Progressive Web App Service Worker
const CACHE_NAME = 'crm-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
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
          if (key !== CACHE_NAME && key !== 'crm-api-cache-v1') {
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

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Bypass service worker for SSE real-time streams, version checks, and dynamic translation API
  if (
    url.pathname.includes('/stream') ||
    url.pathname.includes('/realtime') ||
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
            caches.open('crm-api-cache-v1').then((cache) => cache.put(request, clone));
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

  // Handle static assets & navigation
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
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
