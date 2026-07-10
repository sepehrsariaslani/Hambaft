// Hambaft Service Worker — lightweight, no aggressive caching.
// The app relies on Vite's content-hash filenames for cache busting.
// This SW simply activates immediately and does not intercept requests.

const CACHE_VERSION = 'hambaft-v3'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  // Clean up ALL old caches to ensure fresh assets after deploy
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', () => {
  // No caching — content-hashed URLs handle cache busting naturally.
  // Previous aggressive caching caused stale UI after deploys.
})
