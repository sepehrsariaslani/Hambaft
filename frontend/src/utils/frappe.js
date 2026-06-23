import { frappeRequest } from 'frappe-ui'

export async function call(method, args = {}) {
  return frappeRequest({
    url: `/api/method/${method}`,
    method: 'POST',
    args,
  })
}

export async function getDoc(doctype, name) {
  return frappeRequest({
    url: `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    method: 'GET',
  })
}

export async function getList(doctype, options = {}) {
  const params = new URLSearchParams()
  if (options.fields) params.set('fields', JSON.stringify(options.fields))
  if (options.filters) params.set('filters', JSON.stringify(options.filters))
  if (options.limit) params.set('limit', String(options.limit))
  if (options.limit_start) params.set('limit_start', String(options.limit_start))
  if (options.order_by) params.set('order_by', options.order_by)

  return frappeRequest({
    url: `/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`,
    method: 'GET',
  })
}

export async function createDoc(doctype, data) {
  return frappeRequest({
    url: `/api/resource/${encodeURIComponent(doctype)}`,
    method: 'POST',
    args: data,
  })
}

export async function updateDoc(doctype, name, data) {
  return frappeRequest({
    url: `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    method: 'PUT',
    args: data,
  })
}

export async function deleteDoc(doctype, name) {
  return frappeRequest({
    url: `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    method: 'DELETE',
  })
}

export async function sessionUser() {
  try {
    if (window.user && window.user !== 'Guest') {
      return {
        name: window.user,
        full_name: window.user_full_name || window.user,
        email: window.user,
      }
    }

    const response = await frappeRequest({
      url: '/api/method/frappe.auth.get_logged_user',
      method: 'GET',
    })

    const user = response.message

    if (typeof user === 'string' && user !== 'Guest') {
      try {
        return await getDoc('User', user)
      } catch {
        return { name: user, full_name: user }
      }
    }

    return null
  } catch {
    return null
  }
}
