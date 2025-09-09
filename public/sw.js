/* Minimal SW for caching TF models and pose assets */
const CACHE_NAME = 'imf-model-cache-v1';
const ASSET_PATTERNS = [
  /tensorflow\-models/i,
  /pose\-detection/i,
  /movenet/i,
  /webgl\-backend/i,
  /tfjs\-backend/i,
  /tfjs\-core/i,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const shouldCache = ASSET_PATTERNS.some((re) => re.test(url));
  if (!shouldCache) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const resp = await fetch(event.request);
        if (resp && resp.status === 200 && resp.type === 'basic') {
          cache.put(event.request, resp.clone());
        }
        return resp;
      } catch (e) {
        // Offline: return cached if present
        const fallback = await cache.match(event.request);
        if (fallback) return fallback;
        throw e;
      }
    })
  );
});
