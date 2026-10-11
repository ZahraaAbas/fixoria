import { getCurrentLanguage, translate } from '../i18n'

// مبلغ بالدينار العراقي: "25,000 د.ع" / "IQD 25,000"
export function formatIQD(amount) {
  const number = new Intl.NumberFormat(getCurrentLanguage() === 'en' ? 'en' : 'ar-IQ').format(amount ?? 0)
  return translate('payments.currency').replace('{amount}', number)
}
