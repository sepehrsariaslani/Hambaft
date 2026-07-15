import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkFrappeSession, call } from '../app/frappe'

describe('frappe transport', () => {
  const originalFetch = global.fetch
  const originalCookie = document.cookie

  beforeEach(() => {
    vi.restoreAllMocks()
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    ;(window as Window & { csrf_token?: string; frappe?: { csrf_token?: string } }).csrf_token = undefined
    ;(window as Window & { csrf_token?: string; frappe?: { csrf_token?: string } }).frappe = undefined
  })

  afterEach(() => {
    global.fetch = originalFetch
    document.cookie = originalCookie
  })

  it('hydrates csrf token from check_session responses', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: 'demo@example.com', csrf_token: 'csrf-demo-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as typeof fetch

    await expect(checkFrappeSession()).resolves.toBe('demo@example.com')
    expect((window as Window & { csrf_token?: string }).csrf_token).toBe('csrf-demo-token')
    expect(document.cookie).toContain('csrf_token=csrf-demo-token')
  })

  it('sends csrf header on subsequent post calls once hydrated', async () => {
    ;(window as Window & { csrf_token?: string; frappe?: { csrf_token?: string } }).csrf_token = 'csrf-demo-token'
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: { ok: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as typeof fetch

    await call('hambaft.hambaft.api.update_settings', { data: { theme: 'light' } })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/method/hambaft.hambaft.api.update_settings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'X-Frappe-CSRF-Token': 'csrf-demo-token',
        }),
        credentials: 'same-origin',
      }),
    )
  })
})
