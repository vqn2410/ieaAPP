const CACHE_VERSION = 'v3';
const STATIC_CACHE = `portal-iea-static-${CACHE_VERSION}`;
const PAGE_CACHE = `portal-iea-pages-${CACHE_VERSION}`;

// Assets con hash (JS/CSS compilados): inmutables, siempre desde caché.
const isImmutableAsset = (url) => url.pathname.startsWith('/assets/');

// SPA + HTML: red primero para no servir versiones viejas tras un deploy.
const isNavigation = (request) => request.mode === 'navigate';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('portal-iea-static-') || k.startsWith('portal-iea-pages-') || k.startsWith('portal-iea-runtime-') || k.startsWith('iea-cache-'))
          .filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Nunca cachear el backend (respuestas dinámicas de IA).
  if (url.pathname.startsWith('/api/')) return;

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  // Imágenes, fuentes e íconos propios: rápido desde caché, revalida en fondo.
  if (url.pathname.startsWith('/img/') || url.pathname.startsWith('/anuncios/') || url.pathname.endsWith('.woff2')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }
  event.respondWith(networkFirst(request, PAGE_CACHE, isNavigation(request)));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || refresh.then((response) => response || new Response('Sin conexión', { status: 503 }));
}

async function networkFirst(request, cacheName, fallbackToIndex) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackToIndex) {
      const index = await caches.match('/index.html');
      if (index) return index;
    }
    return new Response('Sin conexión', { status: 503 });
  }
}
