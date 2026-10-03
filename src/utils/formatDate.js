import { getCurrentLanguage } from '../i18n'

export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(getCurrentLanguage() === 'en' ? 'en' : 'ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
