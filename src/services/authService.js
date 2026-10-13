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
      avatar: profile.image || null,
    }
  }

  if (user.role === 'resident') {
    const profile = await apiGet('/resident/me')
    return {
      ...user,
      phone: profile.phone,
      building: profile.building,
      apartment: profile.apartment_number,
      avatar: profile.avatar || null,
      membershipStatus: profile.membership_status,
      compoundName: profile.compound_name,
      compoundActive: profile.compound_active,
    }
  }

  return user
}

// تغيير كلمة السر (POST /auth/change-password): 400 = الحالية غلط، 422 = الجديدة مرفوضة
export async function changePassword({ currentPassword, newPassword }) {
  try {
    await apiPost('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
  } catch (error) {
    if (error.status === 400) throw new Error('WRONG_PASSWORD', { cause: error })
    if (error.status === 422) throw new Error('INVALID_NEW_PASSWORD', { cause: error })
    throw error
  }
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

// وضع العرض: هل الخادم مفعّل أزرار الدخول بدون كلمة سر (نسأل مرة وحدة بكل تحميل للموقع)
let demoPromise = null
export function getDemoMode() {
  if (!demoPromise) {
    demoPromise = apiGet('/auth/demo', { auth: false })
      .then((row) => ({ enabled: Boolean(row.enabled), roles: row.roles || [], companies: row.companies || [] }))
      .catch(() => ({ enabled: false, roles: [], companies: [] }))
  }
  return demoPromise
}

// دخول بضغطة لحساب العرض حسب الدور (resident / artisan / admin / company / owner)
// companyId: لدور الشركة، مدير أي شركة (بدونه: حساب الشركة الافتراضي)
export async function demoLogin(role, companyId) {
  const body = companyId ? { role, company_id: companyId } : { role }
  const token = await apiPost('/auth/demo-login', body, { auth: false })
  setToken(token.access_token)
  return withProfile(mapUserFromApi(await apiGet('/auth/me')))
}

// المستخدم الحالي من جديد (مثلاً بعد ما مشرف المجمع يوافق على الساكن)
export async function reloadCurrentUser() {
  return withProfile(mapUserFromApi(await apiGet('/auth/me')))
}

// المجمعات المفعّلة لقائمة التسجيل
export function getCompoundOptions() {
  return apiGet('/compounds', { auth: false })
}

async function registerUser(payload) {
  try {
    await apiPost('/auth/register', payload, { auth: false })
  } catch (error) {
    if (error.status === 400 && /مجمع/.test(error.message)) {
      throw new Error('COMPOUND_REQUIRED', { cause: error })
    }
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
    compound_id: Number(data.compoundId),
    phone: data.phone,
    building: data.building,
    apartment_number: data.apartment,
  })
}
