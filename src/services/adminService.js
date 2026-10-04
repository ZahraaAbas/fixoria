import { mapReviewDetailed } from './requestsService'
import { apiGet, apiPut } from './apiClient'

function mapAdminArtisan(row) {
  return {
    id: row.id,
    fullName: row.name,
    email: row.email,
    phone: row.phone,
    bio: row.description,
    categoryNames: row.service_names,
    status: row.status,
    avatar: row.image || null,
  }
}

// حسابات الحرفيين الحقيقية (GET /admin/artisans)
export async function getArtisanAccounts() {
  const rows = await apiGet('/admin/artisans')
  return rows.map(mapAdminArtisan)
}

// اعتماد/رفض حرفي حقيقي (PUT /admin/artisans/:id/verify)
export async function approveArtisan(id) {
  const row = await apiPut(`/admin/artisans/${id}/verify?approve=true`)
  return mapAdminArtisan(row)
}

export async function rejectArtisan(id) {
  const row = await apiPut(`/admin/artisans/${id}/verify?approve=false`)
  return mapAdminArtisan(row)
}

// إحصائيات لوحة التحكم الحقيقية (GET /admin/stats)
export async function getDashboardStats() {
  const row = await apiGet('/admin/stats')
  return {
    residentsCount: row.customers_count,
    artisansCount: row.artisans.total,
    approvedArtisansCount: row.artisans.verified,
    pendingArtisansCount: row.artisans.pending,
    totalRequestsCount: row.requests.total,
    activeRequestsCount: row.requests.accepted + row.requests.in_progress,
    completedRequestsCount: row.requests.completed,
    reviewsCount: row.total_reviews,
    averageRating: row.overall_average_rating || 0,
  }
}

function mapAdminRequest(row) {
  return {
    id: row.id,
    title: row.title,
    categoryName: row.service_name,
    residentName: row.customer_name,
    artisanName: row.artisan_name,
    building: row.building,
    apartment: row.unit_number,
    description: row.description,
    status: row.status,
  }
}

// كل الطلبات الحقيقية (GET /admin/requests)
export async function getRequestsOverview() {
  const rows = await apiGet('/admin/requests')
  return rows.map(mapAdminRequest)
}

// كل التقييمات الحقيقية (GET /admin/reviews)
export async function getReviewsOverview() {
  const rows = await apiGet('/admin/reviews')
  return rows.map(mapReviewDetailed)
}

// إخفاء/إظهار تقييم حقيقي (PUT /admin/requests/:id/review/visibility)
export async function setReviewVisibility(requestId, hidden) {
  const row = await apiPut(`/admin/requests/${requestId}/review/visibility?hidden=${hidden}`)
  return mapReviewDetailed(row)
}
