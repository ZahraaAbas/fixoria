import { translate } from '../i18n'

// مدة بالساعات ← نص مقروء: "أقل من ساعة" / "5 ساعات" / "2.5 يوم"
export function formatHours(hours) {
  if (hours == null) return null
  if (hours < 1) return translate('duration.underHour')
  if (hours < 48) return translate('duration.hours').replace('{n}', Math.round(hours))
  const days = Math.round((hours / 24) * 10) / 10
  return translate('duration.days').replace('{n}', days)
}
