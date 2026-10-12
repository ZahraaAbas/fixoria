import { apiGet, apiPost, apiPut } from './apiClient'
import { mapAdminRequest } from './adminService'

// لوحة مدير شركة الصيانة (/company/*)

function mapArtisan(row) {
  return {
    id: row.id,
    fullName: row.name,
    email: row.email,
    phone: row.phone || '',
    bio: row.description || '',
    categoryIds: row.service_ids,
    categoryNames: row.service_names,
    isActive: row.status === 'approved',
    rating: row.average_rating,
    reviewsCount: row.reviews_count,
    avatar: row.image || null,
  }
}

export async function getCompanyOverview() {
  const row = await apiGet('/company/overview')
  return {
    companyName: row.company_name,
    companyActive: row.company_active,
    artisans: row.artisans,
    activeArtisans: row.active_artisans,
    openRequests: row.open_requests,
    activeRequests: row.active_requests,
    completedRequests: row.completed_requests,
    compounds: row.compounds.map((c) => ({
      id: c.compound_id,
      name: c.compound_name,
      isActive: c.compound_active,
      serviceNames: c.service_names,
    })),
  }
}

export async function getCompanyArtisans() {
  return (await apiGet('/company/artisans')).map(mapArtisan)
}

export async function addCompanyArtisan({ fullName, email, password, phone, categoryIds, bio }) {
  try {
    return mapArtisan(
      await apiPost('/company/artisans', {
        name: fullName,
        email,
        password,
        phone,
        service_ids: categoryIds,
        description: bio || null,
      }),
    )
  } catch (error) {
    if (error.status === 400 && /الإيميل/.test(error.message)) throw new Error('EMAIL_TAKEN', { cause: error })
    throw error
  }
}

export async function updateCompanyArtisan(id, changes) {
  const body = {}
  if ('phone' in changes) body.phone = changes.phone
  if ('bio' in changes) body.description = changes.bio
  if ('categoryIds' in changes) body.service_ids = changes.categoryIds
  if ('isActive' in changes) body.is_active = changes.isActive
  return mapArtisan(await apiPut(`/company/artisans/${id}`, body))
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

// ملخص مدفوعات الشهر لطلبات حرفيي الشركة (تجريبي)
export async function getCompanyPaymentsSummary() {
  return mapPaymentsSummary(await apiGet('/company/payments/summary'))
}

// طلبات حرفيي الشركة + الطلبات المفتوحة بمجمعاتها (نفس شكل صفحة طلبات المشرف)
export async function getCompanyRequests() {
  return (await apiGet('/company/requests')).map(mapAdminRequest)
}
