// ============================================================
// TuongTanDigital-AI v3.0 — Service Worker (CSP Fixed)
// ============================================================

const CACHE_NAME  = 'ttd-ai-v3-cache';
const OFFLINE_URL = '/offline.html';

// Chỉ cache các file local của app
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/offline.html'
];

// Các domain KHÔNG được cache (luôn fetch từ network)
const SKIP_CACHE_ORIGINS = [
  'accounts.google.com',
  'googleapis.com',
  'googleusercontent.com',
  'google.com',
  'gstatic.com',
  'script.google.com',
  'generativelanguage.googleapis.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unpkg.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com'
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching assets...');
        // Cache từng file, không dừng nếu 1 file lỗi
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url =>
            cache.add(url).catch(err =>
              console.warn('[SW] Skip cache for:', url, err.message)
            )
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Chỉ xử lý GET
  if (event.request.method !== 'GET') return;

  // Bỏ qua non-http schemes
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // Bỏ qua tất cả external domains (Google, CDN, API...)
  const isExternal = SKIP_CACHE_ORIGINS.some(origin =>
    url.hostname.includes(origin)
  );
  if (isExternal) return; // Để browser xử lý bình thường

  // Bỏ qua nếu không cùng origin với app
  if (url.origin !== self.location.origin) return;

  // Chỉ cache các file local của app
  event.respondWith(cacheFirstLocal(event.request));
});

/**
 * Cache First cho file local — serve từ cache, fallback network.
 */
async function cacheFirstLocal(request) {
  try {
    // Thử cache trước
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fetch từ network
    const response = await fetch(request);

    // Chỉ cache response thành công
    if (
      response &&
      response.status === 200 &&
      response.type === 'basic'
    ) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (err) {
    // Fallback offline page cho navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_URL);
      if (offlinePage) return offlinePage;
    }
    // Trả về lỗi đơn giản
    return new Response('Offline', { status: 503 });
  }
}
