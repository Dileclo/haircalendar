const CACHE = 'hail-v2';
const STATIC_CACHE = 'hail-static-v2';
const API_CACHE = 'hail-api-v2';

// Resources to pre-cache on install (HTML pages + critical assets)
const PRE_CACHE = [
  '/',
  '/calendar',
  '/clients',
  '/expenses',
  '/statistics',
  '/offline',
  '/offline.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install: cache HTML pages AND their sub-resources (JS/CSS) ──
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // 1. Cache the HTML pages and static files
      const results = await Promise.allSettled(
        PRE_CACHE.map(url =>
          fetch(url, { credentials: 'same-origin' }).then(resp => {
            if (resp.ok) cache.put(url, resp.clone());
            return resp;
          })
        )
      );
      const okCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[SW] Pre-cached ${okCount}/${PRE_CACHE.length} core resources`);

      // 2. Extract <script> and <link> URLs from cached pages,
      //    and pre-cache those _next/static assets too
      const assetUrls = new Set();
      for (const url of PRE_CACHE) {
        try {
          const resp = await cache.match(url);
          if (!resp) continue;
          const html = await resp.clone().text();
          // Match: src="..." or href="..." for _next/static resources
          const re = /(?:src|href)="(\/_next\/static\/[^"]+)"/g;
          let m;
          while ((m = re.exec(html)) !== null) assetUrls.add(m[1]);
        } catch {}
      }

      if (assetUrls.size > 0) {
        console.log(`[SW] Pre-caching ${assetUrls.size} asset URLs from pages`);
        const staticCache = await caches.open(STATIC_CACHE);
        await Promise.allSettled(
          [...assetUrls].map(url =>
            fetch(url, { credentials: 'same-origin' }).then(resp => {
              if (resp.ok) staticCache.put(url, resp);
            })
          )
        );
      }
    })().catch(err => console.error('[SW] Install error:', err))
  );
  // NOTE: dont call skipWaiting() — it causes infinite reload loop in dev
  // The SW will activate naturally when all tabs are refreshed
});

// ── Activate: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE && k !== STATIC_CACHE && k !== API_CACHE)
          .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
      )
    )
  );
  self.clients.claim().catch(() => {});
  // NOTE: claim() is safe here — only runs once after SW naturally activates
  // (after all tabs using old SW are closed/refreshed)
});

// ── Fetch: route by request type ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;
  // Skip non-http
  if (!url.protocol.startsWith('http')) return;
  // Skip ALL Next.js internal dev/HMR/data/image requests
  // Only handle _next/static/ (JS/CSS bundles) explicitly below
  if (url.pathname.startsWith('/_next/') && !url.pathname.startsWith('/_next/static/')) return;

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

  // Page navigations (including RSC): Stale-While-Revalidate
  // Serve from cache instantly; update cache from network in background
  event.respondWith(staleWhileRevalidate(request));
});

// ── Cache-First strategy (for static assets) ──
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
    // Offline + not in cache → empty response
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

// ── Network-First strategy (for API) ──
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
    return cached || new Response(
      JSON.stringify({ success: false, error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ── Stale-While-Revalidate strategy (for pages) ──
// Serve from cache IMMEDIATELY, then update cache from network in background.
// If not cached, try network → cache → serve. If network fails → offline page.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);

  // Check cache first
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) {
    // Background update (don't block response)
    fetch(request).then(resp => {
      if (resp.ok) cache.put(request, resp.clone());
    }).catch(() => {});
    return cached;
  }

  // Not in cache — try network
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached → try matching without RSC header
    // Next.js client navigation adds "RSC:1" header — strip it and try cache
    if (request.headers.get('RSC')) {
      const noRsc = new Request(request.url, {
        method: 'GET',
        headers: { 'Accept': 'text/html' },
      });
      const htmlCached = await cache.match(noRsc, { ignoreSearch: true });
      if (htmlCached) return htmlCached;
    }

    // Only serve offline page for HTML navigations, not for JS/CSS/JSON/etc
    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      const offlineHtml = await cache.match('/offline.html');
      if (offlineHtml) return offlineHtml;

      const offlinePage = await cache.match('/offline');
      if (offlinePage) return offlinePage;

      return new Response(
        '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Нет сети</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;background:#F2F2F7;color:#1C1C1E}h1{font-size:22px;margin-bottom:8px}p{font-size:14px;color:#8E8E93}@media(prefers-color-scheme:dark){body{background:#000;color:#fff}}</style></head><body><div><div style="font-size:80px;margin-bottom:16px">📡</div><h1>Нет сети</h1><p>Проверьте соединение с интернетом</p></div></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Non-HTML request — return empty error
    return new Response('', { status: 503 });
  }
}

// ── Background sync ──
self.addEventListener('sync', event => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncMutations());
  }
});

// ── Messages from page ──
self.addEventListener('message', event => {
  if (event.data?.type === 'SYNC_NOW') {
    event.waitUntil(syncMutations().then(() => {
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SYNC_COMPLETE' }))
      );
    }));
  }
});

// ── Replay queued mutations from IndexedDB (via client) ──
async function syncMutations() {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_MUTATIONS' });
  }
}

// ── Push notification handler ──
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

// ── Notification click — open the app ──
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
