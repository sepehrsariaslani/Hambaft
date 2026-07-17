// Hambaft Service Worker — lightweight, network-first for shell.
// Content-hashed assets (JS/CSS) are inherently cache-busting.
// Only index.html needs explicit network-first to detect new deploys.

const CACHE_VERSION = 'hambaft-v35'

self.addEventListener('install', (event) => {
  // Activate immediately — don't wait for old tabs to close.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  // Clean up old caches and take control of all clients immediately.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim()).then(async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      await Promise.all(
        clients.map((client) => {
          if (!client.url || !client.url.startsWith(self.location.origin)) return Promise.resolve()
          return client.navigate(client.url).catch(() => undefined)
        })
      )
    })
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const isSameOrigin = url.origin === self.location.origin
  const acceptHeader = event.request.headers.get('accept') || ''
  const isAppNavigation =
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' &&
      isSameOrigin &&
      acceptHeader.includes('text/html') &&
      !url.pathname.startsWith('/api/') &&
      !url.pathname.startsWith('/assets/') &&
      !url.pathname.startsWith('/files/') &&
      !url.pathname.startsWith('/private/files/'))

  // index.html must always come from network (no hash → stale cache risk).
  // Match both the standalone page and the Frappe-served asset.
  const isIndexHtml =
    url.pathname.endsWith('/index.html') ||
    url.pathname === '/assets/hambaft/' ||
    url.pathname === '/hambaft' ||
    url.pathname === '/hambaft/'

  if (isIndexHtml || isAppNavigation) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          // Cache a copy for offline fallback.
          const clone = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // All other requests (hashed assets, API calls) — browser default caching.
  // Hashed filenames guarantee freshness; API calls should not be cached.
})
