import { apiPut } from './apiClient'

function mapArtisanProfile(row) {
  return {
    fullName: row.name,
    phone: row.phone,
    bio: row.description,
    categoryIds: row.service_ids,
    status: row.status,
    rating: row.average_rating,
    reviewsCount: row.reviews_count,
  }
}

// تحديث ملف الحرفي الحقيقي (PUT /artisans/me)
export async function updateArtisanProfile({ fullName, phone, bio, categoryIds }) {
  const row = await apiPut('/artisans/me', {
    name: fullName,
    phone,
    description: bio,
    service_ids: categoryIds,
  })
  return mapArtisanProfile(row)
}
