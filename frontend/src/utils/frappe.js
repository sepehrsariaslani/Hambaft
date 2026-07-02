// Frappe API utility — uses Frappe session (cookie-based), no custom tokens

export async function call(method, args = {}) {
  const res = await fetch(`/api/method/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(args),
  })
  return res.json()
}

export async function getDoc(doctype, name) {
  const res = await fetch(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    credentials: 'same-origin',
  })
  return res.json()
}

export async function getList(doctype, options = {}) {
  const params = new URLSearchParams()
  if (options.fields) params.set('fields', JSON.stringify(options.fields))
  if (options.filters) params.set('filters', JSON.stringify(options.filters))
  if (options.limit) params.set('limit', String(options.limit))
  if (options.limit_start) params.set('limit_start', String(options.limit_start))
  if (options.order_by) params.set('order_by', options.order_by)

  const res = await fetch(`/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`, {
    credentials: 'same-origin',
  })
  return res.json()
}

export async function createDoc(doctype, data) {
  const res = await fetch(`/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateDoc(doctype, name, data) {
  const res = await fetch(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteDoc(doctype, name) {
  const res = await fetch(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  })
  return res.json()
}

/**
 * Check if the user has an active Frappe session.
 * Returns the username string (e.g. "user@example.com") or null.
 * Uses the hambaft-specific check_session endpoint which is whitelisted for guests.
 */
export async function checkFrappeSession() {
  try {
    const response = await fetch('/api/method/hambaft.hambaft.api.check_session', {
      credentials: 'same-origin',
    })
    const data = await response.json()
    const user = data.message?.user || data.user
    if (typeof user === 'string' && user !== 'Guest' && user !== 'guest') {
      return user
    }
    return null
  } catch {
    return null
  }
}

/**
 * Get the current user's Hambaft profile.
 */
export async function getHambaftProfile() {
  const res = await fetch('/api/method/hambaft.hambaft.api.get_profile', {
    credentials: 'same-origin',
  })
  const data = await res.json()
  if (data.message) {
    return data.message
  }
  return data
}
