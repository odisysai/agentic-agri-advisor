const CACHE_NAME = 'krishi-sampark-cache-v32';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/landing.css',
  '/device.js',
  '/agui/index.html',
  '/assets/krishi_microphone_icon.png',
  '/assets/krishi_speaker_icon.png',
  '/public/favicon.ico',
  '/public/favicon.svg',
  '/public/favicon-192.png',
  '/public/favicon-512.png',
  '/public/site.webmanifest',
  '/agui/styles.css',
  '/agui/styles.css?v=18',
  '/agui/dashboard.js?v=34',
  '/agui/panel_router.js',
  '/agui/camera.js',
  '/agui/crop_classifier.js?v=5',
  '/agui/local_models.js?v=13',
  '/agui/local_db.js',
  '/agui/pwa_config.js',
  '/agui/voice.js',
  '/agui/translations.js',
  '/agui/expert_dashboards.js',
  '/a2ui/index.html',
  '/a2ui/styles.css',
  '/a2ui/app.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap'
];

// Install Event - cache core static resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching static assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - clean up obsolete cache keys
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================================
// Background Sync — process pending IndexedDB actions when back online
// ============================================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pending-telemetry') {
    event.waitUntil(
      // Notify all clients to process their sync queues
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'PROCESS_SYNC_QUEUE' });
        });
      })
    );
  }
});

// ============================================================
// Push Notification Handler
// ============================================================
self.addEventListener('push', event => {
  if (!event.data) return;

  let notification;
  try {
    notification = event.data.json();
  } catch (e) {
    notification = { title: 'Krishi Sampark', body: event.data.text() };
  }

  const options = {
    body: notification.body || '',
    icon: '/agui/icons/icon-192.png',
    badge: '/agui/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: notification.data || {},
    actions: notification.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(notification.title || 'Krishi Sampark', options)
  );
});

// Notification click handler — open the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes('/agui/') && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/agui/index.html');
      }
    })
  );
});

// Fetch Event - handle offline resource fetching
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Bypass cache for dynamic API endpoints and SSE stream
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/run_sse') || requestUrl.pathname.startsWith('/feedback') || requestUrl.pathname === '/agui/model_config.js') {
    event.respondWith(
      fetch(event.request)
        .catch(err => {
          console.warn('[Service Worker] Network request failed, returning offline status:', err);
          // Return custom offline JSON response for profile GET requests
          if (event.request.method === 'GET' && requestUrl.pathname.startsWith('/api/profile/')) {
            return new Response(JSON.stringify({
              offline: true,
              message: "Device offline. Data retrieved from local IndexedDB twin."
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          // Return generic error for POST requests
          return new Response(JSON.stringify({
            status: "offline_queued",
            message: "Offline. Action has been queued for synchronization."
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  if (event.request.mode === 'navigate' || requestUrl.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-First (with Network Fallback) for static resources
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Fetch updated version in the background to keep cache fresh
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse.status === 200 && event.request.method === 'GET') {
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {}); // ignore offline background fetch failures
          return cachedResponse;
        }

        // Return from network if not in cache
        return fetch(event.request).then(response => {
          // Do not cache non-200 or non-http responses (e.g. chrome extensions)
          if (!response || response.status !== 200 || !event.request.url.startsWith('http')
              || event.request.method !== 'GET') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          return response;
        }).catch(err => {
          console.warn('[Service Worker] Fetch failed:', event.request.url, err);
          if (requestUrl.pathname.startsWith('/schemas/')) {
            return new Response(JSON.stringify({
              type: "card",
              title: "Offline Fallback",
              components: [{ type: "text", value: "This content is currently unavailable offline." }]
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response("Network error", { status: 480, statusText: "Offline" });
        });
      })
  );
});
