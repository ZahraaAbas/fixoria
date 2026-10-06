import { apiGet, apiPost, apiPut } from './apiClient'
import { shrinkImage } from '../utils/files'

function mapArtisanProfile(row) {
  return {
    fullName: row.name,
    phone: row.phone,
    bio: row.description,
    categoryIds: row.service_ids,
    status: row.status,
    rating: row.average_rating,
    reviewsCount: row.reviews_count,
    avatar: row.image || null,
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

// رفع صورة الحرفي (POST /artisans/me/image)
export async function uploadArtisanImage(file) {
  const form = new FormData()
  form.append('file', await shrinkImage(file))
  const row = await apiPost('/artisans/me/image', form)
  return mapArtisanProfile(row)
}

export function mapResidentProfile(row) {
  return {
    fullName: row.name,
    email: row.email,
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    building: row.building || '',
    floor: row.floor || '',
    apartment: row.apartment_number || '',
    avatar: row.avatar || null,
  }
}

// ملف الساكن (GET/PUT /resident/me)
export async function getResidentProfile() {
  return mapResidentProfile(await apiGet('/resident/me'))
}

export async function updateResidentProfile(values) {
  try {
    const row = await apiPut('/resident/me', {
      name: values.fullName,
      email: values.email,
      phone: values.phone,
      whatsapp: values.whatsapp || null,
      building: values.building,
      floor: values.floor || null,
      apartment_number: values.apartment,
    })
    return mapResidentProfile(row)
  } catch (error) {
    // الخادم يرجع 400 عندما يكون الإيميل الجديد مسجّلًا لحساب آخر
    if (error.status === 400 && /إيميل|email/i.test(error.message)) {
      throw new Error('EMAIL_TAKEN', { cause: error })
    }
    throw error
  }
}

// رفع صورة الساكن (POST /resident/me/avatar)
export async function uploadResidentAvatar(file) {
  const form = new FormData()
  form.append('file', await shrinkImage(file))
  return mapResidentProfile(await apiPost('/resident/me/avatar', form))
}
