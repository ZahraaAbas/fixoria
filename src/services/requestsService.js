import { apiGet, apiPost, apiPut } from './apiClient'

const STORAGE_KEY = 'fixoria_requests'
const MOCK_DELAY_MS = 600

// تقديم طلب حقيقي عبر الباكند (POST /resident/requests). باقي هذا الملف لسا وهمي (Mock) لحين ننقله بخطوات لاحقة.
export function createResidentRequest({
  categoryId,
  title,
  description,
  building,
  apartment,
  preferredDate,
  contactName,
  images = [],
}) {
  const form = new FormData()
  form.append('service_id', categoryId)
  if (title) form.append('title', title)
  if (description) form.append('description', description)
  if (building) form.append('building', building)
  if (apartment) form.append('unit_number', apartment)
  if (contactName) form.append('contact_name', contactName)
  if (preferredDate) form.append('scheduled_at', new Date(preferredDate).toISOString())
  // صور المشكلة: نفس اسم الحقل مكرر لكل صورة (images) كما يتوقع الخادم
  images.forEach((file) => form.append('images', file))

  return apiPost('/resident/requests', form)
}

function mapResidentRequest(row) {
  return {
    id: row.id,
    title: row.title,
    categoryName: row.service_name,
    status: row.status,
    building: row.building,
    apartment: row.unit_number,
    preferredDate: row.scheduled_at,
    description: row.description,
    progress: row.progress,
    rejectionReason: row.rejection_reason,
    canReview: row.can_review,
    myRating: row.my_rating,
    myReviewComment: row.my_review_comment,
    images: row.images || [],
  }
}

// قائمة طلبات الساكن الحقيقية (GET /resident/requests)
export async function getMyResidentRequests() {
  const rows = await apiGet('/resident/requests')
  return rows.map(mapResidentRequest)
}

// تفاصيل طلب واحد حقيقي (GET /resident/requests/:id)
export async function getResidentRequestById(id) {
  try {
    const detail = await apiGet(`/resident/requests/${id}`)
    return mapResidentRequest(detail)
  } catch (error) {
    if (error.status === 404) {
      throw new Error('NOT_FOUND', { cause: error })
    }
    throw error
  }
}

// إلغاء طلب حقيقي (POST /resident/requests/:id/cancel)
export async function cancelResidentRequest(id) {
  const detail = await apiPost(`/resident/requests/${id}/cancel`)
  return mapResidentRequest(detail)
}

// إرسال تقييم حقيقي (POST /reviews)
export function submitResidentReview({ requestId, rating, comment }) {
  return apiPost('/reviews', { request_id: Number(requestId), rating, comment })
}

export function mapReviewDetailed(row) {
  return {
    requestId: row.request_id,
    title: row.request_title,
    categoryName: row.service_name,
    rating: row.rating,
    comment: row.comment,
    residentName: row.customer_name,
    artisanName: row.artisan_name,
    isHidden: row.is_hidden,
  }
}

function mapArtisanRequest(row) {
  return {
    id: row.id,
    title: row.title,
    categoryName: row.service_name,
    status: row.status,
    building: row.building,
    apartment: row.unit_number,
    preferredDate: row.scheduled_at,
    description: row.description,
    progress: row.progress,
    customerName: row.customer_name,
    createdAt: row.created_at,
    images: row.images || [],
  }
}

async function updateArtisanRequestStatus(id, status) {
  const detail = await apiPut(`/requests/${id}/status`, { status })
  return mapArtisanRequest(detail)
}

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

// الطلبات المتاحة لتصنيفات هذا الحرفي (GET /requests/available)
export async function getAvailableRequestsForArtisan() {
  const rows = await apiGet('/requests/available')
  return rows.map(mapArtisanRequest)
}

// قبول طلب (PUT /requests/:id/status) — الباكند يعيّن هذا الحرفي تلقائيًا
export function acceptRequest(id) {
  return updateArtisanRequestStatus(id, 'accepted')
}

// تجاهل طلب (POST /requests/:id/dismiss)
export function dismissRequestForArtisan(requestId) {
  return apiPost(`/requests/${requestId}/dismiss`)
}

// طلبات هذا الحرفي (المقبولة/الجارية/المكتملة) — GET /requests
export async function getRequestsForArtisan() {
  const rows = await apiGet('/requests')
  return rows.map(mapArtisanRequest)
}

export function startRequest(id) {
  return updateArtisanRequestStatus(id, 'in_progress')
}

export function completeRequest(id) {
  return updateArtisanRequestStatus(id, 'completed')
}

// تقييمات هذا الحرفي (GET /artisans/me/reviews)
export async function getReviewsForArtisan() {
  const rows = await apiGet('/artisans/me/reviews')
  return rows.map(mapReviewDetailed).filter((review) => !review.isHidden)
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