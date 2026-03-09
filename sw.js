// ============================================================
// TuongTanDigital-AI v3.0 — Service Worker
// Strategy: Cache First (assets) + Network First (API)
// ============================================================

const CACHE_NAME    = 'ttd-ai-v3-cache';
const OFFLINE_URL   = '/offline.html';

// Assets to cache on install (Cache First strategy)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/offline.html'
];

// API origins that should always be Network First
const NETWORK_FIRST_ORIGINS = [
  'generativelanguage.googleapis.com',
  'accounts.google.com',
  'script.google.com'
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching assets...');
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW] Pre-cache partial failure (ok for dev):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and unsupported schemes
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // Network First for API calls
  const isNetworkFirst = NETWORK_FIRST_ORIGINS.some(origin =>
    url.hostname.includes(origin)
  );

  if (isNetworkFirst) {
    event.respondWith(networkFirstStrategy(event.request));
  } else {
    event.respondWith(cacheFirstStrategy(event.request));
  }
});

/**
 * Cache First Strategy — serve from cache, fallback to network, cache new responses.
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL) || new Response(
        '<h1>Bạn đang offline</h1><p>Vui lòng kết nối mạng để sử dụng TuongTanDigital-AI.</p>',
        { headers: { 'Content-Type': 'text/html;charset=utf-8' } }
      );
    }
    return new Response('Network error', { status: 408 });
  }
}

/**
 * Network First Strategy — try network, fallback to cache.
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('{"error":"offline"}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ===== BACKGROUND SYNC (for future use) =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notebooks') {
    console.log('[SW] Background sync: notebooks');
  }
});

// ===== PUSH NOTIFICATIONS (for future use) =====
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'TuongTanDigital-AI', {
      body: data.body || '',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg'
    })
  );
});
