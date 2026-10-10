import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, Shield, UserCheck, Wrench, X } from 'lucide-react'
import { translate } from '../../i18n'
import { fadeUp, stagger } from './motion'
import './LoginChooser.css'

const ROLES = [
  { to: '/login', labelKey: 'landing.residentLogin', Icon: UserCheck, tone: 'primary' },
  { to: '/artisan/login', labelKey: 'landing.artisanLogin', Icon: Wrench, tone: 'default' },
  { to: '/admin/login', labelKey: 'landing.adminLogin', Icon: Shield, tone: 'subtle' },
]

// نافذة اختيار نوع الحساب: تطلع لما الزائر يضغط "تسجيل الدخول"
function LoginChooser({ open, onClose }) {
  const reduceMotion = useReducedMotion()
  const panelRef = useRef(null)

  // Escape + قفل التمرير + التركيز داخل النافذة ثم رجوعه للزر
  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector('a')?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="lc-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.div
            ref={panelRef}
            className="lc-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lc-title"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
          >
            <div className="lc-head">
              <div>
                <h2 id="lc-title" className="lc-title">
                  {translate('nav.login')}
                </h2>
                <p className="lc-subtitle">{translate('loginChooser.subtitle')}</p>
              </div>
              <button type="button" className="lc-close" onClick={onClose} aria-label={translate('common.close')}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <motion.nav
              className="lc-roles"
              aria-label={translate('nav.login')}
              variants={stagger(0.08, 0.06)}
              initial={reduceMotion ? false : 'hidden'}
              animate="visible"
            >
              {ROLES.map(({ to, labelKey, Icon, tone }) => (
                <motion.div key={to} variants={fadeUp}>
                  <Link to={to} className={`lc-role lc-role--${tone}`} onClick={onClose}>
                    <span className="lc-role-icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <span className="lc-role-label">{translate(labelKey)}</span>
                    <span className="lc-role-arrow" aria-hidden="true">
                      <ArrowLeft size={18} className="icon-forward" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default LoginChooser
