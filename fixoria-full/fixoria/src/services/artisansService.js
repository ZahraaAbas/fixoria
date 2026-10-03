import { apiFetch, ApiError, fileUrl } from './api'

function toArtisan(a) {
  return {
    id: a.id,
    fullName: a.name,
    categoryId: a.service_id,
    categoryName: a.service_name || a.specialty,
    rating: a.average_rating,
    reviewsCount: a.reviews_count,
    bio: a.description,
    location: a.location,
    phone: a.phone,
    image: fileUrl(a.image),
    verified: a.verified,
  }
}

export async function getArtisans() {
  const list = await apiFetch('/artisans?verified_only=true', { auth: false })
  return list.map(toArtisan)
}

// حرفيو خدمة معيّنة (موثّقين فقط، الأعلى تقييماً أولاً)
export async function getArtisansByService(serviceId) {
  const list = await apiFetch(`/artisans?verified_only=true&service_id=${Number(serviceId)}`, { auth: false })
  return list.map(toArtisan)
}

export async function getArtisanById(id) {
  try {
    return toArtisan(await apiFetch(`/artisans/${Number(id)}`, { auth: false }))
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
      throw new Error('NOT_FOUND')
    }
    throw error
  }
}
