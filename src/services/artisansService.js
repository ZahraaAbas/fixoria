import { apiGet } from './apiClient'

function mapArtisan(artisan) {
  return {
    id: artisan.id,
    fullName: artisan.name,
    bio: artisan.description,
    rating: artisan.average_rating,
    reviewsCount: artisan.reviews_count,
    categoryNames: artisan.service_names,
  }
}

export function getArtisans() {
  return apiGet('/artisans?verified_only=true', { auth: false }).then((data) =>
    data.map(mapArtisan),
  )
}

export async function getArtisanById(id) {
  try {
    const artisan = await apiGet(`/artisans/${id}`, { auth: false })
    return mapArtisan(artisan)
  } catch (error) {
    if (error.status === 404) {
      throw new Error('NOT_FOUND', { cause: error })
    }
    throw error
  }
}
