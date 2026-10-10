import { Globe } from 'lucide-react'
import { getCurrentLanguage, setLanguage } from '../../i18n'

// زر تبديل اللغة (چان بالصفحة الأولى بس، وانتقل للهيدر وصفحات الدخول)
function LanguageToggle({ className = '' }) {
  const isEnglish = getCurrentLanguage() === 'en'

  return (
    <button
      type="button"
      className={className}
      onClick={() => setLanguage(isEnglish ? 'ar' : 'en')}
      lang={isEnglish ? 'ar' : 'en'}
      aria-label={isEnglish ? 'العربية' : 'English'}
      title="تبديل اللغة / Change language"
    >
      <Globe size={15} aria-hidden="true" />
      <span>{isEnglish ? 'العربية' : 'English'}</span>
    </button>
  )
}

export default LanguageToggle
