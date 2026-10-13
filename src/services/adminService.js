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
    serviceIds: row.service_ids || [],
    status: row.status,
    avatar: row.image || null,
  }
}

function mapResident(row) {
  return {
    id: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    building: row.building || '',
    floor: row.floor || '',
    apartment: row.apartment_number || '',
    membershipStatus: row.membership_status,
  }
}

// سكان المجمع وحالة عضويتهم (GET /admin/residents)
export async function getResidents() {
  return (await apiGet('/admin/residents')).map(mapResident)
}

export async function setResidentMembership(userId, status) {
  return mapResident(await apiPut(`/admin/residents/${userId}/membership`, { status }))
}

// حسابات الحرفيين الحقيقية (GET /admin/artisans)
export async function getArtisanAccounts() {
  const rows = await apiGet('/admin/artisans')
  return rows.map(mapAdminArtisan)
}

// تعيين حرفي لطلب معلق (PUT /admin/requests/:id/assign?artisan_id=)
export async function assignRequest(requestId, artisanId) {
  return apiPut(`/admin/requests/${requestId}/assign?artisan_id=${artisanId}`)
}

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

// سجل الحالات من الخادم (recorded=false: وقت معروف من الطلب نفسه، قبل بدء التسجيل)
export function mapHistory(rows = []) {
  return rows.map((h) => ({ kind: h.kind, at: h.at, actorRole: h.actor_role, recorded: h.recorded }))
}

export function mapAdminRequest(row) {
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
    images: row.images || [],
    audio: row.audio || null,
    // للتحليلات والفلاتر
    serviceId: row.service_id,
    artisanId: row.artisan_id,
    compoundId: row.compound_id ?? null,
    compoundName: row.compound_name ?? null,
    companyId: row.company_id ?? null,
    dispatchDeadline: row.dispatch_deadline ?? null,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at ?? null,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at,
    history: mapHistory(row.history),
    scheduledAt: row.scheduled_at,
    price: row.price,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    paidAt: row.paid_at,
    review: row.review
      ? { rating: row.review.rating, comment: row.review.comment, isHidden: row.review.is_hidden, createdAt: row.review.created_at }
      : null,
  }
}

function mapPaymentsSummary(row) {
  return {
    month: row.month,
    completed: row.completed,
    total: row.total,
    paid: row.paid,
    unpaid: row.unpaid,
    cash: row.cash,
    cardDemo: row.card_demo,
    online: row.online ?? 0,
    unpriced: row.unpriced,
  }
}

// ملخص مدفوعات الشهر للمجمع (تجريبي)
export async function getPaymentsSummary() {
  return mapPaymentsSummary(await apiGet('/admin/payments/summary'))
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

// شركات الصيانة المتعاونة ويه المجمع: خدماتها حسب الاتفاقية وحرفييها وشغلهم بالمجمع
export async function getPartnerCompanies() {
  return (await apiGet('/admin/companies')).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone || '',
    serviceIds: c.service_ids,
    serviceNames: c.service_names,
    openRequests: c.open_requests,
    artisans: c.artisans.map((a) => ({
      ...mapAdminArtisan(a),
      rating: a.average_rating,
      reviewsCount: a.reviews_count,
      activeJobs: a.active_jobs,
      completedJobs: a.completed_jobs,
    })),
  }))
}
