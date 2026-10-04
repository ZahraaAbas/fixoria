const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const TOKEN_KEY = 'fixoria_token'

// الخادم يرجع مسارات الملفات المرفوعة نسبية (/uploads/...)، فنكملها بعنوان الخادم
export function mediaUrl(path) {
  if (!path) return null
  return /^(https?:|blob:|data:)/.test(path) ? path : `${API_BASE_URL}${path}`
}

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

// حالة الاتصال بالخادم: تُبلَّغ بها الواجهة (شريط "تعذّر الاتصال") عند تغيّرها فقط
const connectionListeners = new Set()
let isServerReachable = true

function setServerReachable(reachable) {
  if (reachable === isServerReachable) return
  isServerReachable = reachable
  connectionListeners.forEach((listener) => listener(reachable))
}

export function isServerReachableNow() {
  return isServerReachable
}

export function onConnectionChange(listener) {
  connectionListeners.add(listener)
  return () => connectionListeners.delete(listener)
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const isFormData = body instanceof FormData
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch (cause) {
    // fetch يفشل فقط عندما لا يصل الطلب للخادم (الخادم طافٍ أو لا يوجد إنترنت)
    setServerReachable(false)
    throw new Error('NETWORK_ERROR', { cause })
  }

  setServerReachable(true)

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