import { apiFetch, ApiError } from './api'

// الباكند يسمي الساكن "customer" والفرونت يسميه "resident"
const ROLE_FROM_API = { customer: 'resident', artisan: 'artisan', admin: 'admin' }

function toUser(apiUser, token) {
  return {
    id: apiUser.id,
    fullName: apiUser.name,
    email: apiUser.email,
    role: ROLE_FROM_API[apiUser.role] || apiUser.role,
    token,
  }
}

export async function login({ email, password }) {
  let token
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: email.trim().toLowerCase(), password },
    })
    token = data.access_token
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 422)) {
      throw new Error('INVALID_CREDENTIALS')
    }
    throw error
  }

  const me = await apiFetch('/auth/me', {
    auth: false,
    headers: { Authorization: `Bearer ${token}` },
  })
  return toUser(me, token)
}

export async function register(values) {
  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      auth: false,
      body: {
        name: values.fullName.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: 'customer',
        phone: values.phone.trim(),
        building: values.building.trim(),
        apartment_number: values.apartment.trim(),
      },
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) throw new Error('EMAIL_TAKEN')
    throw error
  }
  return login({ email: values.email, password: values.password })
}
