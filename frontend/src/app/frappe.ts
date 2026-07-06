type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type CallOptions = {
  httpMethod?: HttpMethod
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

  if (httpMethod !== 'GET' && httpMethod !== 'DELETE') {
    headers['Content-Type'] = 'application/json'
  }

  if (csrfToken && httpMethod !== 'GET') {
    headers['X-Frappe-CSRF-Token'] = csrfToken
  }

  const response = await fetch(`/api/method/${method}${httpMethod === 'GET' ? toQueryString(args) : ''}`, {
    method: httpMethod,
    headers,
    credentials: 'same-origin',
    body: httpMethod === 'GET' || httpMethod === 'DELETE' ? undefined : JSON.stringify(args),
  })

  const payload = await parsePayload(response)

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
