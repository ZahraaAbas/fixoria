import { isApprovedResident } from './roles'

export const DEFAULT_REDIRECT = {
  resident: '/home',
  artisan: '/artisan/dashboard',
  admin: '/admin/dashboard',
  owner: '/owner/dashboard',
  company_manager: '/company/dashboard',
}

// وين نودّي المستخدم بعد الدخول (الحرفي غير الموثّق والساكن غير المقبول لصفحات الانتظار)
export function landingFor(user, from) {
  if (user.role === 'artisan' && user.status !== 'approved') return '/artisan/pending'
  if (user.role === 'resident' && !isApprovedResident(user)) return '/resident/pending'
  if (from) return `${from.pathname}${from.search || ''}`
  return DEFAULT_REDIRECT[user.role] || '/home'
}
