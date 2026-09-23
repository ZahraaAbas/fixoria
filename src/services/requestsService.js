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

function updateRequestStatus(id, status) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const requests = readStoredRequests()
      const index = requests.findIndex((item) => item.id === Number(id))
      if (index === -1) {
        reject(new Error('NOT_FOUND'))
        return
      }
      const updated = { ...requests[index], status }
      requests[index] = updated
      writeStoredRequests(requests)
      resolve(updated)
    }, MOCK_DELAY_MS)
  })
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
  return updateRequestStatus(id, 'cancelled')
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

export function getAvailableRequestsForArtisan(artisan) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const dismissed = readDismissedIds(artisan.id)
      const requests = readStoredRequests().filter(
        (request) =>
          request.status === 'Open' &&
          artisan.categoryIds?.includes(request.categoryId) &&
          !dismissed.includes(request.id),
      )
      resolve(requests)
    }, MOCK_DELAY_MS)
  })
}

export function acceptRequest(id, artisan) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const requests = readStoredRequests()
      const index = requests.findIndex((item) => item.id === Number(id))

      if (index === -1 || requests[index].status !== 'Open') {
        reject(new Error('ALREADY_TAKEN'))
        return
      }

      const updated = {
        ...requests[index],
        status: 'accepted',
        artisanId: artisan.id,
        artisanName: artisan.fullName,
      }
      requests[index] = updated
      writeStoredRequests(requests)
      resolve(updated)
    }, MOCK_DELAY_MS)
  })
}

export function dismissRequestForArtisan(requestId, artisanId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const dismissed = readDismissedIds(artisanId)
      writeDismissedIds(artisanId, [...dismissed, Number(requestId)])
      resolve()
    }, MOCK_DELAY_MS)
  })
}

function dismissedStorageKey(artisanId) {
  return `fixoria_dismissed_${artisanId}`
}

function readDismissedIds(artisanId) {
  try {
    const stored = localStorage.getItem(dismissedStorageKey(artisanId))
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeDismissedIds(artisanId, ids) {
  try {
    localStorage.setItem(dismissedStorageKey(artisanId), JSON.stringify(ids))
  } catch {
    // التخزين غير متاح: لن يبقى التجاهل محفوظًا بعد إغلاق الصفحة
  }
}

export function getRequestsForArtisan(artisanId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const requests = readStoredRequests().filter(
        (request) => request.artisanId === artisanId,
      )
      resolve(requests)
    }, MOCK_DELAY_MS)
  })
}

export function startRequest(id) {
  return updateRequestStatus(id, 'in_progress')
}

export function completeRequest(id) {
  return updateRequestStatus(id, 'completed')
}export function getReviewsForArtisan(artisanId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const reviews = readStoredRequests()
        .filter(
          (request) =>
            request.artisanId === artisanId && request.review && !request.review.isHidden,
        )
        .map((request) => ({
          requestId: request.id,
          title: request.title,
          categoryName: request.categoryName,
          ...request.review,
        }))
      resolve(reviews)
    }, MOCK_DELAY_MS)
  })
}

export function getAllRequests() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(readStoredRequests()), MOCK_DELAY_MS)
  })
}
export function toggleReviewVisibility(requestId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const requests = readStoredRequests()
      const index = requests.findIndex((item) => item.id === Number(requestId))
      if (index === -1 || !requests[index].review) {
        reject(new Error('NOT_FOUND'))
        return
      }
      const updated = {
        ...requests[index],
        review: { ...requests[index].review, isHidden: !requests[index].review.isHidden },
      }
      requests[index] = updated
      writeStoredRequests(requests)
      resolve(updated)
    }, MOCK_DELAY_MS)
  })
}