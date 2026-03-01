// Service Worker OOPS — cache offline de base
// Phase 1 : offline shell + assets
// Phase 3 : notifications push

const CACHE_VERSION = 'oops-v4';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/js/app.js',
  '/js/db.js',
  '/js/i18n.js',
  '/js/schedule.js',
  '/js/ui/disclaimer.js',
  '/js/ui/onboarding.js',
  '/js/ui/home.js',
  '/js/ui/session.js',
  '/js/ui/history.js',
  '/js/ui/settings.js',
  '/locales/fr.json',
  '/locales/en.json',
  // WASM (généré par wasm-pack)
  '/pkg/oops.js',
  '/pkg/oops_bg.wasm',
  // Icônes
  '/favicon.svg',
  '/icons/logo.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Exercices
  '/data/exercises/push.json',
  '/data/exercises/squat.json',
  '/data/exercises/hinge.json',
  '/data/exercises/core.json',
  '/data/exercises/mobility.json',
];

// ── Install : précache tous les assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // On ignore les erreurs individuelles (ex: WASM pas encore buildé)
      return Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate : supprime les vieux caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : cache-first pour les assets locaux ──
self.addEventListener('fetch', (event) => {
  // On ne gère que les requêtes GET vers notre origine
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // CDN Dexie : network-first avec fallback cache
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets locaux : cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
