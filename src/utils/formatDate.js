import { getCurrentLanguage } from '../i18n'

function locale() {
  return getCurrentLanguage() === 'en' ? 'en' : 'ar-IQ'
}

// الخادم يخزن الأوقات بتوقيت UTC ويرجعها بدون علامة المنطقة (مثل 2026-10-08T07:30:00)،
// فنعتبرها UTC صراحةً حتى المتصفح يحولها للتوقيت المحلي صح
export function parseApiDate(value) {
  if (typeof value === 'string' && value.includes('T') && !/(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    return new Date(`${value}Z`)
  }
  return new Date(value)
}

export function formatDate(isoString) {
  return parseApiDate(isoString).toLocaleDateString(locale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(isoString) {
  return parseApiDate(isoString).toLocaleString(locale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// تاريخ اليوم بصيغة حقل التاريخ (YYYY-MM-DD) بالتوقيت المحلي
export function todayInputValue() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
