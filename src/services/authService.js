import { apiGet, apiPost, setToken } from './apiClient'

const ROLE_TO_API = { resident: 'customer', artisan: 'artisan', admin: 'admin' }
const ROLE_FROM_API = { customer: 'resident', artisan: 'artisan', admin: 'admin' }

function mapUserFromApi(apiUser) {
  return {
    id: apiUser.id,
    fullName: apiUser.name,
    email: apiUser.email,
    role: ROLE_FROM_API[apiUser.role] || apiUser.role,
  }
}

async function withProfile(user) {
  if (user.role === 'artisan') {
    const profile = await apiGet('/artisans/me')
    return {
      ...user,
      phone: profile.phone,
      bio: profile.description,
      categoryIds: profile.service_ids,
      status: profile.status,
      rating: profile.average_rating,
      reviewsCount: profile.reviews_count,
    }
  }

  if (user.role === 'resident') {
    const profile = await apiGet('/resident/me')
    return {
      ...user,
      phone: profile.phone,
      building: profile.building,
      apartment: profile.apartment_number,
    }
  }

  return user
}

export async function login({ email, password }) {
  try {
    const token = await apiPost('/auth/login', { email, password }, { auth: false })
    setToken(token.access_token)
  } catch (error) {
    if (error.status === 401) {
      throw new Error('INVALID_CREDENTIALS', { cause: error })
    }
    throw error
  }

  const me = await apiGet('/auth/me')
  const user = mapUserFromApi(me)
  return withProfile(user)
}

async function registerUser(payload) {
  try {
    await apiPost('/auth/register', payload, { auth: false })
  } catch (error) {
    if (error.status === 400) {
      throw new Error('EMAIL_TAKEN', { cause: error })
    }
    throw error
  }

  return login({ email: payload.email, password: payload.password })
}

export function registerResident(data) {
  return registerUser({
    name: data.fullName,
    email: data.email,
    password: data.password,
    role: ROLE_TO_API.resident,
    phone: data.phone,
    building: data.building,
    apartment_number: data.apartment,
  })
}

export async function registerArtisan(data) {
  const user = await registerUser({
    name: data.fullName,
    email: data.email,
    password: data.password,
    role: ROLE_TO_API.artisan,
    phone: data.phone,
  })

  await apiPost('/artisans', {
    phone: data.phone,
    service_ids: data.categoryIds,
    description: data.bio,
  })

  return withProfile(user)
}
