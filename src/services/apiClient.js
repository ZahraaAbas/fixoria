const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const TOKEN_KEY = 'fixoria_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // التخزين غير متاح: يبقى التوكن محفوظًا حتى إغلاق الصفحة فقط
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let detail = ''
    try {
      const data = await response.json()
      detail = data.detail || ''
    } catch {
      // لا يوجد جسم JSON بالرد
    }
    const error = new Error(detail || `HTTP_${response.status}`)
    error.status = response.status
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export function apiGet(path, options) {
  return request(path, { ...options, method: 'GET' })
}

export function apiPost(path, body, options) {
  return request(path, { ...options, method: 'POST', body })
}

export function apiPut(path, body, options) {
  return request(path, { ...options, method: 'PUT', body })
}

export function apiDelete(path, options) {
  return request(path, { ...options, method: 'DELETE' })
}