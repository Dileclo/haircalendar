const CACHE = 'hail-v1';
const STATIC_CACHE = 'hail-static-v1';
const API_CACHE = 'hail-api-v1';

// Resources to pre-cache on install
const PRE_CACHE = [
  '/',
  '/calendar',
  '/clients',
  '/expenses',
  '/statistics',
  '/offline',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
];

// Install — pre-cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRE_CACHE).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== STATIC_CACHE && k !== API_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — strategies by request type
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip chrome-extension, etc.
  if (!url.protocol.startsWith('http')) return;

  // Next.js HMR / hot reload — skip
  if (url.pathname.startsWith('/_next/webpack')) return;

  // API requests: Network-First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Next.js static assets: Cache-First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Page navigations & other: Network-First
  event.respondWith(networkFirstPage(request));
});

// Cache-First strategy
async function cacheFirst(request, cacheName = CACHE) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // If offline and not in cache, return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline');
    }
    return new Response('Offline', { status: 503 });
  }
}

// Network-First for API
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ success: false, error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Network-First for pages, fallback to cache, then offline page
async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline');
    }
    return new Response('Offline', { status: 503 });
  }
}

// Background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncMutations());
  }
});

// Listen for messages from the page
self.addEventListener('message', event => {
  if (event.data?.type === 'SYNC_NOW') {
    event.waitUntil(syncMutations().then(() => {
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SYNC_COMPLETE' }))
      );
    }));
  }
});

// Replay queued mutations from IndexedDB
async function syncMutations() {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_MUTATIONS' });
  }
}

// Push notification handler
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const { title, body, url } = event.data.json();
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'appointment-reminder',
        data: { url },
        vibrate: [200, 100, 200],
        requireInteraction: true,
      })
    );
  } catch {}
});

// Notification click — open the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/calendar';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes(url));
      if (existing) {
        existing.focus();
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});
