type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type CallOptions = {
  httpMethod?: HttpMethod
  /** Force JSON body instead of form-encoding (for specific cases) */
  jsonBody?: boolean
}

function persistCsrfToken(token: unknown) {
  if (typeof window === 'undefined') {
    return
  }

  const normalized = typeof token === 'string' ? token.trim() : ''
  if (!normalized) {
    return
  }

  const globalWindow = window as Window & {
    csrf_token?: string
    frappe?: {
      csrf_token?: string
    }
  }

  globalWindow.csrf_token = normalized
  globalWindow.frappe = {
    ...(globalWindow.frappe || {}),
    csrf_token: normalized,
  }

  document.cookie = `csrf_token=${encodeURIComponent(normalized)}; path=/; SameSite=Lax`
}

function getCsrfToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  const globalWindow = window as Window & {
    csrf_token?: string
    frappe?: {
      csrf_token?: string
    }
  }

  const fromWindow = globalWindow.csrf_token || globalWindow.frappe?.csrf_token
  if (fromWindow) {
    return fromWindow
  }

  const fromCookie = document.cookie
    .split('; ')
    .find((chunk) => chunk.startsWith('csrf_token='))
    ?.split('=')
    .slice(1)
    .join('=')

  return decodeURIComponent(fromCookie || '')
}

async function parsePayload(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text ? { message: text } : {}
}

function persistCsrfTokenFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return
  }

  const record = payload as Record<string, any>
  persistCsrfToken(record.csrf_token)
  persistCsrfToken(record.data?.csrf_token)
  persistCsrfToken(record.message?.csrf_token)
  persistCsrfToken(record.message?.data?.csrf_token)
}

/**
 * Build a FormData or URLSearchParams from a flat args object.
 * Complex objects (dicts/lists) are JSON-stringified so Frappe
 * receives them as strings and can json.loads() on the backend.
 */
function serializeArgs(args: Record<string, unknown>): FormData {
  const fd = new FormData()
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    fd.append('csrf_token', csrfToken)
  }
  Object.entries(args).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (typeof value === 'object') {
      fd.append(key, JSON.stringify(value))
    } else {
      fd.append(key, String(value))
    }
  })
  return fd
}

function toQueryString(args: Record<string, unknown>) {
  const params = new URLSearchParams()

  Object.entries(args).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (typeof value === 'object') {
      params.set(key, JSON.stringify(value))
      return
    }

    params.set(key, String(value))
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

/**
 * Call a Frappe whitelisted method.
 *
 * For POST requests we use FormData (form-encoding) by default,
 * which is the standard Frappe convention. This avoids the issue
 * where Frappe serialises nested JSON objects to strings when
 * receiving `Content-Type: application/json`.
 *
 * Set `jsonBody: true` in options to force JSON body.
 */
export async function call<T = any>(
  method: string,
  args: Record<string, unknown> = {},
  options: CallOptions = {},
): Promise<T> {
  const httpMethod = options.httpMethod || 'POST'
  const csrfToken = getCsrfToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  // GET / DELETE → query string
  if (httpMethod === 'GET' || httpMethod === 'DELETE') {
    const response = await fetch(`/api/method/${method}${toQueryString(args)}`, {
      method: httpMethod,
      headers,
      credentials: 'same-origin',
    })
    const payload = await parsePayload(response)
    persistCsrfTokenFromPayload(payload)
    if (!response.ok) {
      throw new Error(
        payload?._error_message ||
          payload?._server_messages ||
          payload?.message ||
          `Request failed: ${response.status}`,
      )
    }
    return payload.message ?? payload
  }

  // POST / PUT → form-encoding (standard Frappe)
  if (options.jsonBody) {
    // Legacy JSON body path — kept for rare edge-cases
    headers['Content-Type'] = 'application/json'
    if (csrfToken) headers['X-Frappe-CSRF-Token'] = csrfToken
    const response = await fetch(`/api/method/${method}`, {
      method: httpMethod,
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(args),
    })
    const payload = await parsePayload(response)
    persistCsrfTokenFromPayload(payload)
    if (!response.ok) {
      throw new Error(
        payload?._error_message ||
          payload?._server_messages ||
          payload?.message ||
          `Request failed: ${response.status}`,
      )
    }
    return payload.message ?? payload
  }

  // Form-encoded — Frappe's native format
  if (csrfToken) {
    headers['X-Frappe-CSRF-Token'] = csrfToken
  }
  const body = serializeArgs(args)
  const response = await fetch(`/api/method/${method}`, {
    method: httpMethod,
    headers,
    credentials: 'same-origin',
    body,
  })

  const payload = await parsePayload(response)
  persistCsrfTokenFromPayload(payload)

  if (!response.ok) {
    throw new Error(
      payload?._error_message ||
        payload?._server_messages ||
        payload?.message ||
        `Request failed: ${response.status}`,
    )
  }

  return payload.message ?? payload
}

export async function callGet<T = any>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  return call<T>(method, args, { httpMethod: 'GET' })
}

export async function getList<T = any>(
  doctype: string,
  options: {
    fields?: string[]
    filters?: unknown
    limit?: number
    limit_start?: number
    order_by?: string
  } = {},
): Promise<T[]> {
  const params = new URLSearchParams()
  if (options.fields) params.set('fields', JSON.stringify(options.fields))
  if (options.filters) params.set('filters', JSON.stringify(options.filters))
  if (options.limit) params.set('limit', String(options.limit))
  if (options.limit_start) params.set('limit_start', String(options.limit_start))
  if (options.order_by) params.set('order_by', options.order_by)

  const response = await fetch(`/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`, {
    credentials: 'same-origin',
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?._error_message || payload?.message || `Request failed: ${response.status}`)
  }

  return payload.data ?? payload.message ?? []
}

export async function createDoc<T = any>(doctype: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(`/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getCsrfToken() ? { 'X-Frappe-CSRF-Token': getCsrfToken() } : {}),
    },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?._error_message || payload?.message || `Request failed: ${response.status}`)
  }

  return payload.data ?? payload.message ?? payload
}

export async function updateDoc<T = any>(
  doctype: string,
  name: string,
  data: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(getCsrfToken() ? { 'X-Frappe-CSRF-Token': getCsrfToken() } : {}),
    },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?._error_message || payload?.message || `Request failed: ${response.status}`)
  }

  return payload.data ?? payload.message ?? payload
}

export async function deleteDoc(doctype: string, name: string): Promise<void> {
  const response = await fetch(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: getCsrfToken() ? { 'X-Frappe-CSRF-Token': getCsrfToken() } : {},
    credentials: 'same-origin',
  })

  if (!response.ok) {
    const payload = await response.json()
    throw new Error(payload?._error_message || payload?.message || `Request failed: ${response.status}`)
  }
}

export async function uploadFile(file: File, options?: { isPrivate?: boolean; folder?: string; doctype?: string; docname?: string }): Promise<{ file_url: string; name: string }> {
  const formData = new FormData()
  formData.append('file', file)
  if (options?.isPrivate !== undefined) formData.append('is_private', options.isPrivate ? '1' : '0')
  if (options?.folder) formData.append('folder', options.folder)
  if (options?.doctype) formData.append('doctype', options.doctype)
  if (options?.docname) formData.append('docname', options.docname)

  const csrfToken = getCsrfToken()
  const response = await fetch('/api/method/upload_file', {
    method: 'POST',
    headers: csrfToken ? { 'X-Frappe-CSRF-Token': csrfToken } : {},
    credentials: 'same-origin',
    body: formData,
  })

  const payload = await parsePayload(response)
  persistCsrfTokenFromPayload(payload)

  if (!response.ok) {
    throw new Error(payload?._error_message || payload?.message || `Upload failed: ${response.status}`)
  }

  const message = payload.message ?? payload
  if (!message.file_url) {
    throw new Error('آپلود فایل ناموفق بود: پاسخ سرور فاقد آدرس فایل است')
  }

  return { file_url: message.file_url, name: message.name }
}

export async function checkFrappeSession(): Promise<string | null> {
  try {
    const payload = await callGet<{ user?: string; message?: { user?: string } }>('hambaft.hambaft.api.check_session')
    const user = payload.message?.user || payload.user

    if (typeof user === 'string' && user !== 'Guest' && user !== 'guest') {
      return user
    }

    return null
  } catch {
    return null
  }
}

export async function getProfile<T = any>(): Promise<T> {
  return callGet<T>('hambaft.hambaft.api.get_profile')
}
