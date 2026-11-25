const BUILD_ID = 'efe496b6e93b';
const PRECACHE = ["./","./assets/index--uqtV4W1.css","./assets/index-899pib0m.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/icon.svg","./manifest.webmanifest"];

const scope = new URL(self.registration.scope);
const CACHE_PREFIX = 'prismafall-' + encodeURIComponent(scope.pathname) + ':';
const CACHE_NAME = CACHE_PREFIX + BUILD_ID;
const startUrl = new URL('./', scope).href;
const indexPath = new URL('index.html', scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

async function precache() {
  if (PRECACHE.length > 0) {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE.map((path) => new URL(path, scope).href));
  }
  await self.skipWaiting();
}

self.addEventListener('activate', (event) => {
  event.waitUntil(activate());
});

async function activate() {
  const names = await caches.keys();
  await Promise.all(names
    .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
    .map((name) => caches.delete(name)));
  await self.clients.claim();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== scope.origin) return;

  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request));
});

async function networkFirst(request) {
  const path = new URL(request.url).pathname;
  if (path !== scope.pathname && path !== indexPath) return fetch(request);

  const response = await fetch(request).catch(() => undefined);
  if (response?.ok) {
    const mime = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    if (path === scope.pathname && response.status === 200 && mime === 'text/html') {
      await storeResponse(await caches.open(CACHE_NAME), startUrl, response);
    }
    return response;
  }
  const cache = await caches.open(CACHE_NAME);
  return await cache.match(startUrl, { ignoreVary: true }) ?? response ?? Response.error();
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.status === 200) await storeResponse(cache, request, response);
  return response;
}

async function storeResponse(cache, key, response) {
  try {
    await cache.put(key, response.clone());
  } catch {
    // Die Netzantwort bleibt bei Speicherproblemen oder nicht speicherbaren Antworten nutzbar.
  }
}
