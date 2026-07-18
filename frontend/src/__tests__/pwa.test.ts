import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { probeServiceWorkerScript, resolvePwaAssetUrl } from '../app/pwa'

describe('PWA registration', () => {
  const originalEnv = import.meta.env.DEV
  const originalFetch = global.fetch
  const originalServiceWorker = navigator.serviceWorker

  beforeEach(() => {
    Object.defineProperty(import.meta, 'env', {
      value: { ...import.meta.env, DEV: false, BASE_URL: '/assets/hambaft/' },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      configurable: true,
    })
    Object.defineProperty(import.meta, 'env', {
      value: { ...import.meta.env, DEV: originalEnv },
      configurable: true,
    })
  })

  it('builds PWA asset urls relative to the Vite base path', () => {
    expect(resolvePwaAssetUrl('sw.js', '/assets/hambaft/')).toBe('/assets/hambaft/sw.js')
  })

  it('rejects service worker registration when the script probe returns html', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    )

    global.fetch = fetchMock

    await expect(probeServiceWorkerScript('/assets/hambaft/sw.js')).resolves.toBe(false)
    expect(fetchMock).toHaveBeenCalledWith('/assets/hambaft/sw.js', expect.any(Object))
  })
})
