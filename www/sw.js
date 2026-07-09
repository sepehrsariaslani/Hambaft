const CACHE_NAME = 'hambaft-pwa-v1'
const APP_SHELL_CACHE = 'hambaft-shell-v1'
const APP_SHELL_URLS = [
  '/hambaft',
  '/hambaft/login',
  '/hambaft/signup',
  '/manifest.json',
  '/hambaft-icon.svg',
  '/hambaft-icon-192.png',
  '/hambaft-icon-512.png',
  '/apple-touch-icon.png',
  '/assets/hambaft/assets/index.css',
  '/assets/hambaft/assets/index.js',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME && key !== APP_SHELL_CACHE) {
              return caches.delete(key)
            }
            return Promise.resolve(false)
          }),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) {
            return cached
          }
          return caches.match('/hambaft')
        }),
    )
    return
  }

  const isStaticAsset =
    url.pathname.startsWith('/assets/hambaft/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/hambaft-icon.svg' ||
    url.pathname === '/hambaft-icon-192.png' ||
    url.pathname === '/hambaft-icon-512.png' ||
    url.pathname === '/apple-touch-icon.png'

  if (!isStaticAsset) {
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        fetch(request)
          .then((response) => caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())))
          .catch(() => {})
        return cached
      }

      return fetch(request).then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      })
    }),
  )
})
