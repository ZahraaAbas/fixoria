// عميل الـ API الموحّد — كل الخدمات تمر من هنا.
// رابط الباكند يُضبط من ملف .env بالمتغير VITE_API_URL (انظر .env.example)

export const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export const AUTH_STORAGE_KEY = 'fixoria_user'
export const UNAUTHORIZED_EVENT = 'fixoria:unauthorized'

export function getToken() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY))?.token || null
  } catch {
    return null
  }
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `HTTP_${status}`)
    this.status = status
    this.detail = detail
  }
}

// يحول detail مال FastAPI لنص مفهوم (أخطاء 422 ترجع كمصفوفة)
function readDetail(data) {
  if (!data) return null
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) return 'البيانات المدخلة غير صالحة'
  return null
}

/**
 * apiFetch('/services')
 * apiFetch('/auth/login', { method: 'POST', body: {...}, auth: false })
 * apiFetch('/resident/requests', { method: 'POST', body: formData })   // FormData تنرسل كما هي
 */
export async function apiFetch(path, { method = 'GET', body, auth = true, headers = {}, raw = false } = {}) {
  const finalHeaders = { ...headers }
  const token = getToken()
  if (auth && token && !finalHeaders.Authorization) {
    finalHeaders.Authorization = `Bearer ${token}`
  }

  let payload = body
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { method, headers: finalHeaders, body: payload })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR')
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    const data = await response.json().catch(() => null)
    throw new ApiError(response.status, readDetail(data))
  }

  if (raw) return response
  if (response.status === 204) return null
  const type = response.headers.get('content-type') || ''
  return type.includes('application/json') ? response.json() : response.text()
}

// روابط الصور المرفوعة (/uploads/...) نسبية للباكند
export function fileUrl(path) {
  if (!path) return null
  return /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`
}

// الباكند يخزن الأوقات UTC بدون منطقة زمنية — نضيف Z حتى المتصفح يعرضها بالتوقيت المحلي
export function parseApiDate(value) {
  if (!value) return null
  const hasZone = /Z$|[+-]\d\d:\d\d$/.test(value)
  return new Date(hasZone ? value : `${value}Z`)
}
