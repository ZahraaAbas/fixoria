import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertCircle } from 'lucide-react'
import { translate } from '../../i18n'

// رسالة خطأ موحّدة لفشل إجراء (قبول، حذف، حفظ...). messageKey فارغ = لا شيء يظهر.
function ActionError({ messageKey, className = '' }) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {messageKey && (
        <motion.p
          className={`fx-notice fx-notice--danger fx-action-error ${className}`}
          role="alert"
          initial={reduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
        >
          <AlertCircle size={18} aria-hidden="true" />
          {translate(messageKey)}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

export default ActionError
