const CACHE_VERSION = 'pokegatchi-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './pgp.html',
  './manifest.webmanifest',
  './assets/styles.css?v=4',
  './js/main.js?v=36',
  './js/core/Store.js?v=3',
  './js/scene/SceneManager.js?v=18',
  './js/scene/ExpressionOverlay.js?v=2',
  './js/data/Pokedex.js?v=2',
  './js/game/balance.js?v=1',
  './js/game/EventBus.js?v=1',
  './js/game/SimulationEngine.js?v=1',
  './js/game/bag/BagMachine.js?v=1',
  './js/game/bag/events.js?v=1',
  './assets/backgrounds/cats-soup/magical-forest.png',
  './assets/backgrounds/cats-soup/sunlit-forest.png',
  './assets/backgrounds/cats-soup/day-forest.png',
  './assets/backgrounds/cats-soup/enchanted-night.png',
  './assets/sprites/generated/pikachu_skin_v1_alpha.png',
  './assets/sprites/generated/eevee_skin_v2_compact_alpha.png',
  './assets/sprites/generated/squirtle_skin_v1_alpha.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = new URL(event.request.url);

  // Keep CDN module imports network-first so dependency updates don't stale-lock.
  if (reqUrl.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
