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