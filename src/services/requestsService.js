const STORAGE_KEY = 'fixoria_requests'
const MOCK_DELAY_MS = 600

function readStoredRequests() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeStoredRequests(requests) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  } catch {
    // التخزين غير متاح: لن تُحفظ الطلبات بعد إغلاق الصفحة
  }
}

export function createRequest(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const requests = readStoredRequests()
      const newRequest = {
        id: Date.now(),
        status: 'Open',
        createdAt: new Date().toISOString(),
        ...payload,
      }
      writeStoredRequests([newRequest, ...requests])
      resolve(newRequest)
    }, MOCK_DELAY_MS)
  })
}

// سنستخدمها في الخطوة القادمة (صفحة "طلباتي")
export function getRequestsByResident(residentId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const requests = readStoredRequests().filter(
        (request) => request.residentId === residentId,
      )
      resolve(requests)
    }, MOCK_DELAY_MS)
  })
}
// مؤقتة للتجربة فقط، ستُستبدل بمنطق الحرفي الحقيقي لاحقًا
export function markRequestCompleted(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const requests = readStoredRequests()
      const index = requests.findIndex((item) => item.id === Number(id))
      if (index === -1) {
        reject(new Error('NOT_FOUND'))
        return
      }
      const updated = { ...requests[index], status: 'completed' }
      requests[index] = updated
      writeStoredRequests(requests)
      resolve(updated)
    }, MOCK_DELAY_MS)
  })
}

export function submitReview(id, { rating, comment }) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const requests = readStoredRequests()
      const index = requests.findIndex((item) => item.id === Number(id))
      if (index === -1) {
        reject(new Error('NOT_FOUND'))
        return
      }
      const updated = {
        ...requests[index],
        review: { rating, comment, createdAt: new Date().toISOString() },
      }
      requests[index] = updated
      writeStoredRequests(requests)
      resolve(updated)
    }, MOCK_DELAY_MS)
  })
}

export function getRequestById(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const request = readStoredRequests().find((item) => item.id === Number(id))
      if (!request) {
        reject(new Error('NOT_FOUND'))
        return
      }
      resolve(request)
    }, MOCK_DELAY_MS)
  })
}

export function cancelRequest(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const requests = readStoredRequests()
      const index = requests.findIndex((item) => item.id === Number(id))
      if (index === -1) {
        reject(new Error('NOT_FOUND'))
        return
      }
      const updated = { ...requests[index], status: 'cancelled' }
      requests[index] = updated
      writeStoredRequests(requests)
      resolve(updated)
    }, MOCK_DELAY_MS)
  })
}