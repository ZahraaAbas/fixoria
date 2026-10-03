import { apiFetch } from './api'

// طلب خدمة جديدة — POST /resident/requests (multipart مع صور الضرر)
export async function createRequest({ categoryId, title, description, building, apartment, preferredDate, images = [] }) {
  const form = new FormData()
  form.append('service_id', String(categoryId))
  form.append('description', [title.trim(), description.trim()].filter(Boolean).join(' — '))
  if (building) form.append('building', building.trim())
  if (apartment) form.append('unit_number', apartment.trim())
  // datetime-local يعطي وقت محلي؛ نحوله ISO (UTC) والباكند يخزنه UTC
  if (preferredDate) form.append('scheduled_at', new Date(preferredDate).toISOString())
  images.forEach((file) => form.append('images', file))

  return apiFetch('/resident/requests', { method: 'POST', body: form })
}

function toRequest(row) {
  return {
    id: row.id,
    title: row.service_name,
    categoryName: row.service_name,
    status: row.status,
    statusLabel: row.status_label,
    preferredDate: row.scheduled_at,
    artisanName: row.artisan_name,
    price: row.price,
    rating: row.my_rating,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  }
}

// طلباتي = الحالية + السجل (مع المرفوضة)، الأحدث أولاً
export async function getMyRequests() {
  const [current, history] = await Promise.all([
    apiFetch('/resident/requests/current'),
    apiFetch('/resident/requests/history?include_rejected=true'),
  ])
  return [...current, ...history]
    .map(toRequest)
    .sort((a, b) => b.id - a.id)
}
