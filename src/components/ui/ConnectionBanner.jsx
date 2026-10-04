import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { WifiOff, X } from 'lucide-react'
import { translate } from '../../i18n'
import { isServerReachableNow, onConnectionChange } from '../../services/apiClient'
import { spring } from './motion'
import './ConnectionBanner.css'

// صفحات الدخول والتسجيل تعرض رسالة الاتصال داخل النموذج نفسه، فلا نكررها في الشريط
const FORM_PAGES = ['/login', '/register', '/artisan/login', '/artisan/register', '/admin/login']

// يظهر عندما يفشل أي طلب في الوصول للخادم، ويختفي تلقائيًا عند نجاح طلب لاحق
function ConnectionBanner() {
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  // يبدأ من الحالة الحالية (قد يكون الاتصال انقطع قبل ظهور الشريط)، ثم يتابع التغيّرات
  const [isOffline, setIsOffline] = useState(() => !isServerReachableNow())
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(
    () =>
      onConnectionChange((reachable) => {
        setIsOffline(!reachable)
        setIsDismissed(false)
      }),
    [],
  )

  return (
    <AnimatePresence>
      {isOffline && !isDismissed && !FORM_PAGES.includes(pathname) && (
        <motion.div
          className="connection-banner"
          role="alert"
          initial={reduceMotion ? false : { opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -12, transition: { duration: 0.2 } }}
          transition={reduceMotion ? { duration: 0 } : spring}
        >
          <span className="connection-banner-icon" aria-hidden="true">
            <WifiOff size={18} />
          </span>
          <p className="connection-banner-text">{translate('common.networkError')}</p>
          <button
            type="button"
            className="connection-banner-close"
            onClick={() => setIsDismissed(true)}
            aria-label={translate('common.close')}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ConnectionBanner
